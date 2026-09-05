import * as schema from '#auth/schema'

export default defineEventHandler(() => ({
  hasLayerField: Boolean(schema.user && 'layerField' in schema.user),
  hasLayerTable: Boolean(schema.layerRecord),
}))
