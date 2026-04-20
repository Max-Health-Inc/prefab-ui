/**
 * Build script — uses Bun's bundler to produce ESM + declarations.
 */

import { $ } from 'bun'

// Clean
await $`rm -rf dist`

// Compile TypeScript → JS + declarations
await $`bunx tsc`

console.log('✅ Build complete → dist/')
