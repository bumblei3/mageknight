
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true, // This allows using describe, it, expect without imports (optional, but convenient)
        setupFiles: ['./tests/setup.js'],
        include: ['tests/**/*.{test,spec}.{js,ts}'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8',
            include: ['js/**/*.{js,ts}'],
            exclude: ['js/three.min.js', 'js/vendor/**'],
            reporter: ['text', 'json', 'html'],
            reportsDirectory: './coverage',
        },
    },
});
