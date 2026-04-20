/**
 * Action type definitions.
 *
 * Actions are serializable commands that the prefab renderer executes
 * client-side (setState, showToast) or via MCP transport (callTool).
 */

/** Serialized action JSON */
export interface ActionJSON {
  action: string
  [key: string]: unknown
}

/** Base interface all actions implement */
export interface Action {
  toJSON(): ActionJSON
}
