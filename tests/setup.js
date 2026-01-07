
import { vi } from 'vitest';

// Global flag to indicate test environment
globalThis.isTestEnvironment = true;

// Mock AudioContext if not present (JSDOM doesn't have it)
if (typeof window !== 'undefined' && !window.AudioContext) {
    window.AudioContext = vi.fn().mockImplementation(function () {
        return {
            state: 'running',
            createGain: vi.fn().mockReturnValue({ gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), connect: vi.fn() }, connect: vi.fn() }),
            createOscillator: vi.fn().mockReturnValue({ type: 'sine', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }),
            createBuffer: vi.fn().mockReturnValue({ getChannelData: vi.fn().mockReturnValue(new Float32Array(1024)) }),
            createBufferSource: vi.fn().mockReturnValue({ buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }),
            createBiquadFilter: vi.fn().mockReturnValue({ type: '', frequency: { value: 0 }, connect: vi.fn() }),
            destination: {},
            currentTime: 0,
            sampleRate: 44100
        };
    });
    window.webkitAudioContext = window.AudioContext;
}

// Mock Canvas getContext for 2D
HTMLCanvasElement.prototype.getContext = function (type) {
    if (type === '2d') {
        return {
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1,
            font: '10px sans-serif',
            textAlign: 'left',
            textBaseline: 'top',
            globalAlpha: 1,
            shadowColor: '',
            shadowBlur: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            fillRect: vi.fn(),
            clearRect: vi.fn(),
            getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(100) })),
            putImageData: vi.fn(),
            createImageData: vi.fn(() => []),
            setTransform: vi.fn(),
            drawImage: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            closePath: vi.fn(),
            stroke: vi.fn(),
            translate: vi.fn(),
            scale: vi.fn(),
            rotate: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            measureText: vi.fn(() => ({ width: 50 })),
            transform: vi.fn(),
            rect: vi.fn(),
            clip: vi.fn(),
            quadraticCurveTo: vi.fn(),
            bezierCurveTo: vi.fn(),
            createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
            createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
            fillText: vi.fn(),
            strokeText: vi.fn(),
            setLineDash: vi.fn(),
            getLineDash: vi.fn(() => []),
            canvas: this,
        };
    }
    return null;
};

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock URL.createObjectURL
if (typeof URL.createObjectURL === 'undefined') {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
}

// Mock requestAnimationFrame
const raf = vi.fn((cb) => setTimeout(cb, 16));
const cancelRaf = vi.fn((id) => clearTimeout(id));

global.requestAnimationFrame = raf;
global.cancelAnimationFrame = cancelRaf;
globalThis.requestAnimationFrame = raf;
globalThis.cancelAnimationFrame = cancelRaf;

if (typeof window !== 'undefined') {
    window.requestAnimationFrame = raf;
    window.cancelAnimationFrame = cancelRaf;
}

// Mock localStorage if not present
if (typeof localStorage === 'undefined') {
    const store = {};
    global.localStorage = {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => { store[key] = String(value); }),
        removeItem: vi.fn((key) => { delete store[key]; }),
        clear: vi.fn(() => { for (const k in store) delete store[k]; }),
    };
}

// Mock matchMedia
if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}
// Mock scrollIntoView (JSDOM doesn't have it)
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
}

// Mock getBoundingClientRect
if (typeof Element !== 'undefined' && !Element.prototype.getBoundingClientRect) {
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
        x: 0,
        y: 0,
        toJSON: () => { }
    }));
}
