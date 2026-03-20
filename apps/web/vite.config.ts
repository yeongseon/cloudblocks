import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@cloudblocks/domain': path.resolve(__dirname, '../../packages/cloudblocks-domain/src/index.ts'),
      '@cloudblocks/schema': path.resolve(__dirname, '../../packages/schema/src/index.ts'),
    },
  },
})
