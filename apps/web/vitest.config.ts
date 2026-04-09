import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@cloudblocks/domain': path.resolve(
        __dirname,
        '../../packages/cloudblocks-domain/src/index.ts',
      ),
      '@cloudblocks/schema': path.resolve(__dirname, '../../packages/schema/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/features/generate/types.ts',
        'src/shared/types/template.ts',
        'src/widgets/scene-canvas/SceneCanvas.tsx',
        // Ops widgets — complex UI shells wired to stores already covered by store-level tests
        'src/widgets/ops-center/OpsCenter.tsx',
        'src/widgets/notification-center/NotificationCenter.tsx',
        'src/widgets/promote-dialog/PromoteDialog.tsx',
        'src/widgets/promote-history/PromoteHistory.tsx',
        'src/widgets/rollback-dialog/RollbackDialog.tsx',
        // CommandCard — heavily interactive mode-switching widget; excluded from coverage
        'src/widgets/bottom-panel/CommandCard.tsx',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
