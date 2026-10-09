import { fileURLToPath } from 'node:url'
import { createPage, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('devtools style isolation', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/devtools-styles', import.meta.url)),
    dev: true,
    browser: true,
  })

  it.each([
    { bodyStyle: '', marginTop: '24px' },
    { bodyStyle: 'margin: 40px; color: red;', marginTop: '40px' },
    { bodyStyle: 'margin: 12px 18px 24px 30px; --host-inline: retained;', marginTop: '12px' },
  ])('preserves host styles with inline body style $bodyStyle after visiting DevTools', async ({ bodyStyle, marginTop }) => {
    const page = await createPage('/')
    try {
      const originalBodyStyle = await page.evaluate((style) => {
        document.body.style.cssText = style
        return document.body.style.cssText
      }, bodyStyle)
      const hostStyles = () => page.evaluate(() => {
        const heading = getComputedStyle(document.querySelector('h2')!)
        const input = getComputedStyle(document.querySelector('input')!)
        return {
          headingSize: heading.fontSize,
          headingBorder: heading.borderBottomWidth,
          inputWidth: input.width,
          inputPadding: input.paddingTop,
          buttonBackground: getComputedStyle(document.querySelector('button')!).backgroundColor,
          panelPadding: getComputedStyle(document.querySelector('.panel')!).paddingTop,
          bodyMargin: getComputedStyle(document.body).marginTop,
          documentTheme: getComputedStyle(document.documentElement).getPropertyValue('--ba-bg').trim(),
        }
      })
      const expected = {
        headingSize: '32px',
        headingBorder: '0px',
        inputWidth: '180px',
        inputPadding: '2px',
        buttonBackground: 'rgb(250, 220, 100)',
        panelPadding: '3px',
        bodyMargin: marginTop,
        documentTheme: '',
      }
      expect(await hostStyles()).toEqual(expected)
      await page.getByRole('button', { name: 'Host button' }).hover()
      expect((await hostStyles()).buttonBackground).toBe('rgb(220, 180, 80)')
      await page.getByRole('heading', { name: 'Host heading' }).hover()
      await page.evaluate('window.useNuxtApp().$router.push("/__better-auth-devtools")')
      await page.waitForURL('**/__better-auth-devtools')
      await page.waitForSelector('.devtools-shell')
      const devtoolsStyles = () => page.evaluate(() => {
        const shell = document.querySelector('.devtools-shell')!
        const style = getComputedStyle(shell)
        return {
          background: style.backgroundColor,
          color: style.color,
          headingSize: getComputedStyle(document.querySelector('h2')!).fontSize,
          bodyMargin: getComputedStyle(document.body).marginTop,
          left: shell.getBoundingClientRect().left,
          documentDark: document.documentElement.classList.contains('dark'),
        }
      })
      expect(await devtoolsStyles()).toEqual({
        background: 'rgb(255, 255, 255)',
        color: 'rgb(31, 31, 31)',
        headingSize: '13px',
        bodyMargin: '0px',
        left: 0,
        documentDark: false,
      })
      // Keep the loaded page CSS in memory when returning to the host app.
      await page.evaluate('window.useNuxtApp().$router.push("/")')
      await page.waitForURL(url('/'))
      await page.getByRole('heading', { name: 'Host heading' }).waitFor()
      await expect.poll(hostStyles).toEqual(expected)
      expect(await page.evaluate(() => document.body.style.cssText)).toBe(originalBodyStyle)
      await page.getByRole('button', { name: 'Host button' }).hover()
      expect((await hostStyles()).buttonBackground).toBe('rgb(220, 180, 80)')
      await page.getByRole('heading', { name: 'Host heading' }).hover()
      await page.evaluate('window.useNuxtApp().$router.push("/__better-auth-devtools")')
      await page.waitForURL('**/__better-auth-devtools')
      await page.waitForSelector('.devtools-shell')

      // Exercise the same connection setter used by the DevTools host iframe.
      await page.evaluate(() => {
        Object.assign(window, {
          __NUXT_DEVTOOLS__: {
            host: { app: { colorMode: { value: 'dark' } }, hooks: { hook() {} } },
          },
        })
      })
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.devtools-shell')!).backgroundColor === 'rgb(17, 17, 17)')
      expect(await devtoolsStyles()).toEqual({
        background: 'rgb(17, 17, 17)',
        color: 'rgb(244, 244, 245)',
        headingSize: '13px',
        bodyMargin: '0px',
        left: 0,
        documentDark: false,
      })
      await page.evaluate('window.useNuxtApp().$router.push("/")')
      await page.waitForURL(url('/'))
      await page.getByRole('heading', { name: 'Host heading' }).waitFor()
      await expect.poll(hostStyles).toEqual(expected)
      expect(await page.evaluate(() => document.body.style.cssText)).toBe(originalBodyStyle)
    }
    finally {
      await page.close()
    }
  })

  it('follows the native DevTools 4 dock host theme and cleans up its subscription', async () => {
    const page = await createPage('/')
    try {
      await page.evaluate(() => {
        const callbacks = new Set<() => void>()
        Object.assign(window, {
          __NUXT_DEVTOOLS_HOST__: {
            app: { colorMode: { value: 'dark' } },
            hooks: {
              hook(_name: string, callback: () => void) {
                callbacks.add(callback)
                return () => callbacks.delete(callback)
              },
            },
          },
          __authThemeCallbacks: callbacks,
        })
        const iframe = document.createElement('iframe')
        iframe.dataset.authDock = ''
        iframe.src = '/__better-auth-devtools'
        document.body.append(iframe)
      })
      const frame = page.frameLocator('iframe[data-auth-dock]')
      const shell = frame.locator('.devtools-shell')
      const background = () => shell.evaluate(element => getComputedStyle(element).backgroundColor)
      await expect.poll(background).toBe('rgb(17, 17, 17)')
      expect(await shell.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false)
      const setTheme = async (theme: 'light' | 'dark') => page.evaluate((value) => {
        const host = window as typeof window & {
          __NUXT_DEVTOOLS_HOST__: { app: { colorMode: { value: string } } }
          __authThemeCallbacks: Set<() => void>
        }
        host.__NUXT_DEVTOOLS_HOST__.app.colorMode.value = value
        host.__authThemeCallbacks.forEach(callback => callback())
      }, theme)
      await setTheme('light')
      await expect.poll(background).toBe('rgb(255, 255, 255)')
      await setTheme('dark')
      await expect.poll(background).toBe('rgb(17, 17, 17)')
      expect(await page.locator('h2').evaluate(element => getComputedStyle(element).fontSize)).toBe('32px')
      expect(await page.evaluate(() => getComputedStyle(document.body).marginTop)).toBe('24px')
      await shell.evaluate(() => (window as typeof window & { useNuxtApp: () => { $router: { push: (path: string) => Promise<unknown> } } }).useNuxtApp().$router.push('/'))
      await frame.getByRole('heading', { name: 'Host heading' }).waitFor()
      expect(await page.evaluate(() => (window as typeof window & { __authThemeCallbacks: Set<() => void> }).__authThemeCallbacks.size)).toBe(0)
    }
    finally {
      await page.close()
    }
  })
})
