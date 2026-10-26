import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)

const typescript6 = require.resolve('@typescript/typescript6')
const typescript6Root = dirname(dirname(typescript6))

const Module = require('node:module')

const resolveFilename = Module._resolveFilename
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'typescript')
    return typescript6
  if (request.startsWith('typescript/'))
    return require.resolve(join(typescript6Root, request.slice(11)))
  return resolveFilename.call(this, request, parent, isMain, options)
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'typescript')
    return nextResolve('@typescript/typescript6', context)
  if (specifier.startsWith('typescript/'))
    return nextResolve(pathToFileURL(require.resolve(join(typescript6Root, specifier.slice(11)))).href, context)
  return nextResolve(specifier, context)
}
