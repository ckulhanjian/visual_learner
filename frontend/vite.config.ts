import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // CLAUDE.md: Vite runs on 5173 and proxies /api to Flask on 5001, so the
    // browser only ever talks to one origin and there's nothing for CORS to block.
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      // Image-kind visuals' asset_path points at Flask's own /uploads/...
      // route (app/__init__.py), not the API — proxied too so an <img>
      // pointed straight at that path works in dev the same way it will
      // once both are served from one origin in production.
      '/uploads': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
})
