
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
            exclude: ['js/three.min.js', 'js/vendor/**'],
            reporter: ['text', 'json', 'html'],
            reportsDirectory: './coverage',
        },
    },
    resolve: {
        alias: {
            '/@': resolve(__dirname, './js'),
        },
    },
});
