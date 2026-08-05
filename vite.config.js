import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

/* Dev-only convenience for the whiteboard's Bedrock settings: serves the
   local ~/.aws/credentials (plus ~/.aws/config, which carries the region) so
   the browser can load a profile without retyping keys. Never part of a
   build — on a static deployment the settings panel falls back to a file
   picker. Requests from any other origin are refused so a stray webpage
   can't read the keys while the dev server is up. */
const awsCredentialsEndpoint = () => ({
  name: 'aws-credentials-endpoint',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__aws/credentials', async (req, res) => {
      const origin = req.headers.origin
      if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        res.statusCode = 403
        return res.end('forbidden')
      }
      const read = (file) => readFile(join(homedir(), '.aws', file), 'utf8')
      const [creds, config] = await Promise.allSettled([read('credentials'), read('config')])
      if (creds.status === 'rejected' && config.status === 'rejected') {
        res.statusCode = 404
        return res.end('no ~/.aws/credentials file found')
      }
      res.setHeader('content-type', 'text/plain')
      // both files use the same INI shape; the client parser merges profiles
      res.end([creds, config].filter((f) => f.status === 'fulfilled').map((f) => f.value).join('\n'))
    })
  },
})

export default defineConfig({
  plugins: [react(), awsCredentialsEndpoint()],
  // Set base path if deploying to a subdirectory
  // e.g., base: '/presentation-app/' for https://example.com/presentation-app/
  // Use './' for relative paths (works anywhere)
  base: './',
})
