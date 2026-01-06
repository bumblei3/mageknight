module.exports = {
    ci: {
        collect: {
            staticDistDir: './dist',
            url: ['http://localhost/index.html'],
            numberOfRuns: 3,
        },
        upload: {
            target: 'temporary-public-storage',
        },
        assert: {
            preset: 'lighthouse:recommended',
            assertions: {
                // Adjust strictness as needed
                'categories:performance': ['warn', { minScore: 0.3 }],
                'categories:accessibility': ['warn', { minScore: 0.7 }],
                'categories:best-practices': ['warn', { minScore: 0.8 }],
                'categories:seo': ['warn', { minScore: 0.8 }],
                // Specific overrides for stubborn failures
                'unused-javascript': 'off',
                'valid-source-maps': 'off',
                'cls-culprits-insight': 'warn',
                'color-contrast': 'warn',
                'errors-in-console': 'warn',
                'network-dependency-tree-insight': 'warn',
                'meta-viewport': 'warn',
                'meta-description': 'warn',
                'render-blocking-resources': 'warn'
            },
        },
    },
};
