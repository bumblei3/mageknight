/**
 * Performance Monitor for Mage Knight
 * Tracks FPS, memory usage, and render times
 */
import { logger } from './logger';

export class PerformanceMonitor {
    private fps: number;
    private frameCount: number;
    private lastFpsUpdate: number;
    private frameTimes: number[];
    private maxFrameTimes: number;
    private memoryUsage: number;
    private showOverlay: boolean;
    private overlay: HTMLDivElement | null;
    private rafId: number | null;
    private memoryInterval: number | NodeJS.Timeout | null;
    private isRunning: boolean;
    private updateRectBound: () => void;

    constructor() {
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        this.frameTimes = [];
        this.maxFrameTimes = 60;

        this.memoryUsage = 0;
        this.showOverlay = false;
        this.overlay = null;
        this.rafId = null;
        this.memoryInterval = null;
        this.isRunning = false;

        this.startMonitoring();
    }

    startMonitoring(): void {
        // @ts-ignore - Check for test environment
        if (typeof globalThis !== 'undefined' && globalThis.isTestEnvironment) return;

        // FPS counter loop
        this.isRunning = true;
        this.measureFrame();

        // Memory sampling (every 2 seconds)
        const perf = performance as any;
        if (perf.memory) {
            this.memoryInterval = setInterval(() => {
                this.memoryUsage = Math.round(perf.memory.usedJSHeapSize / 1048576);
            }, 2000);
        }

        logger.info('📊 Performance monitor initialized');
    }

    stopMonitoring(): void {
        this.isRunning = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        if (this.memoryInterval) {
            clearInterval(this.memoryInterval as number);
        }
    }

    measureFrame(): void {
        if (!this.isRunning) return;

        const now = performance.now();
        this.frameCount++;

        // Update FPS every second
        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = now;

            if (this.showOverlay) {
                this.updateOverlay();
            }
        }

        this.rafId = requestAnimationFrame(() => this.measureFrame());
    }

    recordFrameTime(duration: number): void {
        this.frameTimes.push(duration);
        if (this.frameTimes.length > this.maxFrameTimes) {
            this.frameTimes.shift();
        }
    }

    getAverageFrameTime(): number {
        if (this.frameTimes.length === 0) return 0;
        return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    }

    getFPS(): number {
        return this.fps;
    }

    getMemoryUsage(): number {
        return this.memoryUsage;
    }

    toggleOverlay(): void {
        this.showOverlay = !this.showOverlay;

        if (this.showOverlay) {
            this.createOverlay();
        } else if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    createOverlay(): void {
        if (this.overlay) return;

        this.overlay = document.createElement('div');
        this.overlay.id = 'perf-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            padding: 8px 12px;
            border-radius: 4px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(this.overlay);
        this.updateOverlay();
    }

    updateOverlay(): void {
        if (!this.overlay) return;

        const fpsColor = this.fps >= 55 ? '#0f0' : this.fps >= 30 ? '#ff0' : '#f00';
        const avgFrame = this.getAverageFrameTime().toFixed(1);

        let html = `<span style="color: ${fpsColor}">FPS: ${this.fps}</span>`;
        html += ` | Frame: ${avgFrame}ms`;

        if (this.memoryUsage > 0) {
            const memColor = this.memoryUsage < 100 ? '#0f0' : this.memoryUsage < 200 ? '#ff0' : '#f00';
            html += ` | <span style="color: ${memColor}">Mem: ${this.memoryUsage}MB</span>`;
        }

        this.overlay.innerHTML = html;
    }

    getStats(): { fps: number; averageFrameTime: number; memoryUsage: number } {
        return {
            fps: this.fps,
            averageFrameTime: this.getAverageFrameTime(),
            memoryUsage: this.memoryUsage
        };
    }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();
