
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true, // This allows using describe, it, expect without imports (optional, but convenient)
        setupFiles: ['./tests/setup.js'],
        include: ['tests/**/*.test.js'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8', // or 'c8'
            reporter: ['text', 'json', 'html'],
        },
    },
});
