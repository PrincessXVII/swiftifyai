import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-markdown') || id.includes('remark-gfm') || id.includes('react-syntax-highlighter')) {
            return 'markdown-vendor'
          }
          if (id.includes('@supabase/supabase-js')) return 'supabase-vendor'
          if (id.includes('react') || id.includes('react-dom')) return 'react-vendor'
          if (id.includes('zustand') || id.includes('uuid') || id.includes('date-fns')) return 'core-vendor'
          return 'vendor'
        },
      },
    },
  },
})
