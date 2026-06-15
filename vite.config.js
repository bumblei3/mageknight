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
                        // Remaining vendor
                        return 'vendor';
                    }
                    // Let Vite handle dynamic import chunking for local modules
                    // Dynamic imports like import('./3d/Game3D') will create separate chunks automatically
                }
            },
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
