/**
 * MCP protocol types used by display helpers.
 *
 * These match the Model Context Protocol spec for tool results.
 * @see https://spec.modelcontextprotocol.io/specification/server/tools/
 */

/** MCP text content block */
export interface McpTextContent {
  type: 'text'
  text: string
}

/** MCP image content block */
export interface McpImageContent {
  type: 'image'
  data: string
  mimeType: string
}

/** MCP embedded resource content block */
export interface McpResourceContent {
  type: 'resource'
  resource: {
    uri: string
    mimeType?: string
    text?: string
    blob?: string
  }
}

/** Any MCP content block */
export type McpContent = McpTextContent | McpImageContent | McpResourceContent

/** MCP tool result — returned from tool handlers */
export interface McpToolResult {
  content: McpContent[]
  isError?: boolean
}
