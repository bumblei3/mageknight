
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./tests/setup.js'],
        include: ['tests/**/*.{test,spec}.{js,ts}'],
        exclude: ['node_modules', 'dist', 'tests/e2e/**/*'],
        coverage: {
            provider: 'v8',
            include: ['js/**/*.{js,ts}'],
            exclude: [
                'js/three.min.js',
                'js/vendor/**',
                'js/main.ts',
                'js/card.ts',
                'js/errorHandler.ts',
                'js/performanceMonitor.ts',
                'js/workers/aiWorker.js',
                'js/icons.ts',
                'js/event-bus-types.ts',
                'js/3d/Game3D.ts',
                'js/hexgrid.ts',
                'js/ui.ts',
                'js/ui/**',
                'js/game/HeroController.ts',
                'js/game/InputController.ts',
                'js/siteInteraction.ts',
                'js/particles.ts',
                'js/touchController.ts',
                'tests/**',
                'node_modules/**',
                '*.config.js',
            ],
            reporter: ['text', 'json', 'html'],
            reportsDirectory: './coverage',
            clean: true,
            lines: 80,
            functions: 80,
            branches: 80,
            statements: 80,
            check: true,
        },
    },
    resolve: {
        alias: {
            '/@': resolve(__dirname, './js'),
        },
    },
});
