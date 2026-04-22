/**
 * Default MCP transport — sends tool calls via HTTP POST.
 */

import type { McpTransport } from './actions.js'

/** MCP JSON-RPC response shape */
interface McpResponse {
  error?: { message?: string }
  result?: {
    content?: McpContentBlock[]
  }
  content?: McpContentBlock[]
}

interface McpContentBlock {
  type: string
  text?: string
  $prefab?: unknown
}

export interface McpTransportOptions {
  /** Base URL for the MCP endpoint. Defaults to window location origin. */
  baseUrl?: string
  /** Custom headers for MCP requests. */
  headers?: Record<string, string>
  /** Custom fetch function (for testing). */
  fetch?: typeof globalThis.fetch
}

/**
 * Create an HTTP-based MCP transport.
 *
 * Sends tool calls as POST to `{baseUrl}/mcp/tools/call` with the
 * standard MCP JSON-RPC format.
 */
export function createHttpTransport(opts?: McpTransportOptions): McpTransport {
  const baseUrl = opts?.baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '')
  const headers = { 'Content-Type': 'application/json', ...opts?.headers }
  const fetchFn = opts?.fetch ?? globalThis.fetch.bind(globalThis)

  return {
    async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
      const response = await fetchFn(`${baseUrl}/mcp/tools/call`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name, arguments: args },
        }),
      })

      if (!response.ok) {
        throw new Error(`MCP tool call failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json() as McpResponse
      if (result.error) {
        throw new Error(result.error.message ?? 'MCP tool call returned error')
      }

      // Parse prefab content from result
      const content = result.result?.content ?? result.content ?? []
      for (const block of content) {
        if (block.type === 'text' && block.text !== undefined) {
          try {
            const parsed: unknown = JSON.parse(block.text)
            if (typeof parsed === 'object' && parsed !== null && '$prefab' in parsed) return parsed
            // Return the parsed value (unwraps JSON-encoded primitives)
            return parsed
          } catch { /* not JSON — return raw text */ }
          return block.text
        }
      }
      return result.result ?? result
    },

    async sendMessage(message: string): Promise<void> {
      await fetchFn(`${baseUrl}/mcp/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message }),
      })
    },
  }
}

/** No-op transport for standalone rendering without MCP. */
export function createNoopTransport(): McpTransport {
  return {
    callTool(name: string): Promise<unknown> {
      console.warn(`[prefab] No MCP transport: callTool('${name}') ignored`)
      return Promise.resolve(null)
    },
    sendMessage(message: string): Promise<void> {
      console.warn(`[prefab] No MCP transport: sendMessage ignored`, message)
      return Promise.resolve()
    },
  }
}
