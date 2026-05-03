import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        timeout: 300_000,
        configure: (proxy) => {
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            if (req.url?.includes('/writing/generate')) {
              req.socket?.setTimeout(300_000)
            }
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            if (req.url?.includes('/writing/generate')) {
              proxyRes.headers['cache-control'] = 'no-cache, no-transform'
              delete proxyRes.headers['content-length']
              proxyRes.socket?.setTimeout(300_000)
            }
          })
        },
      },
    },
  },
})
