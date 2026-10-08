import { fileURLToPath } from 'node:url'
import { createPage, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('devtools style isolation', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/devtools-styles', import.meta.url)),
    dev: true,
    browser: true,
  })

  it('preserves host styles on initial load and after visiting DevTools', async () => {
    const page = await createPage('/')
    try {
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
        bodyMargin: '24px',
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
    }
    finally {
      await page.close()
    }
  })
})
