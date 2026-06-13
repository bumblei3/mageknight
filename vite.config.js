import { defineConfig } from 'vite';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    base: '/mageknight/',
    root: '.',
    publicDir: 'public',
    server: {
        port: 8080,
        open: true
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            },
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        // Three.js - large, loaded lazily for 3D view
                        if (id.includes('three')) {
                            return 'vendor-three';
                        }
                        // Game3D - only used when 3D view is toggled
                        if (id.includes('Game3D') || id.includes('OrbitControls')) {
                            return 'vendor-3d';
                        }
                        // Remaining vendor
                        return 'vendor';
                    }
                    // App code - minimal main chunk (entry point only)
                    if (id.includes('/constants') || id.includes('/utils/') || id.includes('/i18n/') || id.includes('/logger') || id.includes('/eventBus') || id.includes('/errorHandler') || id.includes('/performanceMonitor') || id.includes('/animator') || id.includes('/particles/') || id.includes('/soundManager') || id.includes('/statistics') || id.includes('/achievements') || id.includes('/tutorialManager') || id.includes('/touchController') || id.includes('/timeManager') || id.includes('/debug')) {
                        return 'main';
                    }
                    // Core entities: shared between game-core and combat
                    if (id.includes('/hero') || id.includes('/card') || id.includes('/enemy') || id.includes('/unit') || id.includes('/mana') || id.includes('/skills') || id.includes('/terrain') || id.includes('/hexgrid')) {
                        return 'shared-core';
                    }
                    // Feature-based chunks
                    if (id.includes('/game/')) {
                        return 'game-core';
                    }
                    if (id.includes('/combat/')) {
                        return 'combat';
                    }
                    if (id.includes('/sites/')) {
                        return 'sites';
                    }
                    if (id.includes('/3d/')) {
                        return 'game-3d';
                    }
                    if (id.includes('/ui/')) {
                        return 'ui';
                    }
                }
            }
        },
        chunkSizeWarningLimit: 800
    },
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}']
            },
            manifest: {
                name: 'Mage Knight',
                short_name: 'MageKnight',
                description: 'Mage Knight Web Adaptation',
                theme_color: '#ffffff',
                icons: [
                    {
                        src: 'icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            }
        })
    ],
    esbuild: {
        format: 'esm'
    },
    resolve: {
        alias: {
            '/@': resolve(__dirname, './js'),
        },
    },
});
