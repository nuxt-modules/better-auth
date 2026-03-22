import { defineEventHandler } from 'nitro/h3'
import { enforceRouteAccess } from '../internal/route-access'

export default defineEventHandler(enforceRouteAccess)
