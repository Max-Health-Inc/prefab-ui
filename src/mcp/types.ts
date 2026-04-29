/**
 * MCP protocol types used by display helpers.
 *
 * These are structurally compatible with `@modelcontextprotocol/sdk`'s
 * `CallToolResult` — prefab display helpers can be returned directly from
 * SDK tool handlers without casting.
 *
 * @see https://spec.modelcontextprotocol.io/specification/server/tools/
 */

/** MCP text content block (compatible with SDK's TextContent) */
export interface McpTextContent {
  type: 'text'
  text: string
  annotations?: Record<string, unknown>
  _meta?: Record<string, unknown>
}

/** MCP image content block (compatible with SDK's ImageContent) */
export interface McpImageContent {
  type: 'image'
  data: string
  mimeType: string
  annotations?: Record<string, unknown>
  _meta?: Record<string, unknown>
}

/** Text resource contents (has `text`, never `blob`). */
export interface McpTextResourceContents {
  uri: string
  mimeType?: string
  text: string
  _meta?: Record<string, unknown>
}

/** Blob resource contents (has `blob`, never `text`). */
export interface McpBlobResourceContents {
  uri: string
  mimeType?: string
  blob: string
  _meta?: Record<string, unknown>
}

/** MCP embedded resource content block (compatible with SDK's EmbeddedResource) */
export interface McpResourceContent {
  type: 'resource'
  resource: McpTextResourceContents | McpBlobResourceContents
  annotations?: Record<string, unknown>
  _meta?: Record<string, unknown>
}

/** Any MCP content block */
export type McpContent = McpTextContent | McpImageContent | McpResourceContent

/**
 * MCP tool result — returned from tool handlers.
 *
 * Structurally assignable to `@modelcontextprotocol/sdk`'s `CallToolResult`.
 * The index signature allows the SDK's `Result` base interface to be satisfied
 * without requiring an explicit cast.
 */
export interface McpToolResult {
  content: McpContent[]
  /** Structured payload forwarded to MCP Apps iframes via ui/notifications/tool-result. */
  structuredContent?: Record<string, unknown>
  isError?: boolean
  _meta?: Record<string, unknown>
  [key: string]: unknown
}
