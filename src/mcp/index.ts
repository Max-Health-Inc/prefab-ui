/**
 * MCP display helpers — return prefab UIs as MCP tool results.
 */

export { display, display_form, display_update, display_error, display_success, displayForm, displayUpdate, displayError, displaySuccess, resourceMeta, PREFAB_CDN_META } from './display.js'
export type {
  DisplayOptions,
  DisplayFormOptions,
  DisplayErrorOptions,
  DisplaySuccessOptions,
  StateUpdate,
  PrefabUpdateWire,
  McpAppCsp,
  McpAppPermissions,
  ResourceMetaOptions,
} from './display.js'
export type { McpToolResult, McpContent, McpTextContent, McpImageContent, McpResourceContent, McpTextResourceContents, McpBlobResourceContents } from './types.js'
