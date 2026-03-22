import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/.pnpm/interactjs@')) {
            return 'interact'
          }

          if (id.includes('node_modules/.pnpm/react-dom@') || id.includes('node_modules/.pnpm/scheduler@')) {
            return 'react-dom'
          }

          if (id.includes('node_modules/.pnpm/react@')) {
            return 'react'
          }
        },
      },
    },
  },
  resolve: {
    alias: [
      {
        find: '@cloudblocks/domain',
        replacement: path.resolve(__dirname, '../../packages/cloudblocks-domain/src/index.ts'),
      },
      {
        find: '@cloudblocks/schema',
        replacement: path.resolve(__dirname, '../../packages/schema/src/index.ts'),
      },
      {
        find: /^react-hot-toast$/,
        replacement: path.resolve(__dirname, './src/shared/vendor/reactHotToast.tsx'),
      },
    ],
  },
})
