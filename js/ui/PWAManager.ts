/**
 * PWA Manager — Service Worker, Install Prompt, Offline Detection
 */

export class PWAManager {
    private swPath: string;
    private installPromptEvent: any = null;
    private isOnline: boolean = navigator.onLine;
    private onStatusChange: ((online: boolean) => void) | null = null;

    constructor() {
        this.swPath = './sw.js';
    }

    /**
     * Register the Service Worker
     */
    async register(): Promise<boolean> {
        if (!('serviceWorker' in navigator)) {
            console.warn('[PWA] Service Worker not supported');
            return false;
        }

        try {
            const registration = await navigator.serviceWorker.register(this.swPath, {
                scope: './'
            });

            console.log('[PWA] Service Worker registered:', registration.scope);

            // Auto-update when new SW is found
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated') {
                            console.log('[PWA] New Service Worker activated');
                        }
                    });
                }
            });

            return true;
        } catch (error) {
            console.warn('[PWA] Service Worker registration failed:', error);
            return false;
        }
    }

    /**
     * Setup Install Prompt (BeforeInstallPrompt API)
     */
    setupInstallPrompt(onInstall?: () => void): void {
        window.addEventListener('beforeinstallprompt', (e: any) => {
            e.preventDefault();
            this.installPromptEvent = e;
            console.log('[PWA] Install prompt available');

            // Show custom install button if callback provided
            if (onInstall) {
                onInstall();
            }
        });

        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App installed');
            this.installPromptEvent = null;
        });
    }

    /**
     * Trigger install prompt — returns true if accepted
     */
    async triggerInstall(): Promise<boolean> {
        if (!this.installPromptEvent) {
            return false;
        }

        this.installPromptEvent.prompt();
        const { outcome } = await this.installPromptEvent.userChoice;
        this.installPromptEvent = null;

        return outcome === 'accepted';
    }

    /**
     * Check if install prompt is available
     */
    canInstall(): boolean {
        return this.installPromptEvent !== null;
    }

    /**
     * Setup online/offline detection
     */
    setupConnectivityDetection(onStatusChange: (online: boolean) => void): void {
        this.onStatusChange = onStatusChange;

        window.addEventListener('online', () => {
            this.isOnline = true;
            this.onStatusChange?.(true);
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.onStatusChange?.(false);
        });
    }

    /**
     * Check if app is currently online
     */
    isOnlineNow(): boolean {
        return this.isOnline;
    }

    /**
     * Check if app is running as installed PWA
     */
    isInstalled(): boolean {
        return window.matchMedia('(display-mode: standalone)').matches ||
               (window.navigator as any).standalone === true;
    }

    /**
     * Get PWA status for debugging
     */
    getStatus(): { sw: boolean; install: boolean; online: boolean; installed: boolean } {
        return {
            sw: 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null,
            install: this.canInstall(),
            online: this.isOnlineNow(),
            installed: this.isInstalled()
        };
    }
}

export default PWAManager;
