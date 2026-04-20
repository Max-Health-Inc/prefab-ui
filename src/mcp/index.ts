/**
 * MCP display helpers — return prefab UIs as MCP tool results.
 */

export { display, display_form, display_update, display_error } from './display.js'
export type {
  DisplayOptions,
  DisplayFormOptions,
  DisplayErrorOptions,
  StateUpdate,
  PrefabUpdateWire,
} from './display.js'
export type { McpToolResult, McpContent, McpTextContent, McpImageContent, McpResourceContent } from './types.js'
