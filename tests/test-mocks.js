/**
 * Shared mock utilities for testing
 * Provides centralized mock definitions for Canvas, DOM, and Storage APIs
 */

/**
 * Creates a spy function that tracks calls
 * @param {Function} implementation - Optional function to execute
 * @returns {Function} Spy function with tracking
 */
export function createSpy(implementation = () => { }) {
    const spy = function (...args) {
        spy.calls.push(args);
        spy.callCount++;
        const result = implementation(...args);
        spy.returnValues.push(result);
        return result;
    };

    spy.calls = [];
    spy.callCount = 0;
    spy.returnValues = [];
    spy.reset = () => {
        spy.calls = [];
        spy.callCount = 0;
        spy.returnValues = [];
    };
    spy.calledWith = (...expectedArgs) => {
        return spy.calls.some(call =>
            call.length === expectedArgs.length &&
            call.every((arg, i) => arg === expectedArgs[i])
        );
    };

    return spy;
}


/**
 * Creates a mock 2D canvas context with all common methods
 */
export function createMockContext() {
    return {
        beginPath: createSpy(),
        moveTo: createSpy(),
        lineTo: createSpy(),
        closePath: createSpy(),
        stroke: createSpy(),
        fill: createSpy(),
        clearRect: createSpy(),
        save: createSpy(),
        restore: createSpy(),
        clip: createSpy(),
        translate: createSpy(),
        scale: createSpy(),
        rotate: createSpy(),
        drawImage: createSpy(),
        createRadialGradient: createSpy(() => ({
            addColorStop: createSpy()
        })),
        createLinearGradient: createSpy(() => ({
            addColorStop: createSpy()
        })),
        measureText: createSpy((text) => ({ width: text.length * 8 })),
        fillText: createSpy(),
        strokeText: createSpy(),
        arc: createSpy(),
        arcTo: createSpy(),
        bezierCurveTo: createSpy(),
        quadraticCurveTo: createSpy(),
        rect: createSpy(),
        fillRect: createSpy(),
        strokeRect: createSpy(),
        setTransform: createSpy(),
        resetTransform: createSpy(),
        ellipse: createSpy(),
        createPattern: createSpy(() => ({})),
        getImageData: createSpy(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
        putImageData: createSpy(),
        // Common properties
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
        globalAlpha: 1,
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        shadowColor: 'transparent',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0
    };
}

/**
 * Creates a mock canvas element
 */
export function createMockCanvas(width = 800, height = 600) {
    const context = createMockContext();
    return {
        getContext: (type) => type === '2d' ? context : null,
        width,
        height,
        style: {},
        addEventListener: () => { },
        removeEventListener: () => { },
        getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            right: width,
            bottom: height,
            width,
            height,
            x: 0,
            y: 0
        })
    };
}

/**
 * Mock HTMLElement class
 */
export class MockHTMLElement {
    constructor(tagName = 'div') {
        this.tagName = tagName.toUpperCase();
        this.style = {};
        this.classList = {
            add: (...classes) => {
                this._classes = this._classes || new Set();
                classes.forEach(c => this._classes.add(c));
            },
            remove: (...classes) => {
                this._classes = this._classes || new Set();
                classes.forEach(c => this._classes.delete(c));
            },
            contains: (className) => {
                this._classes = this._classes || new Set();
                return this._classes.has(className);
            },
            toggle: (className) => {
                this._classes = this._classes || new Set();
                if (this._classes.has(className)) {
                    this._classes.delete(className);
                } else {
                    this._classes.add(className);
                }
            }
        };
        this.dataset = {};
        this.children = [];
        this.innerHTML = '';
        this.textContent = '';
        this.value = '';
        this.id = '';
        this.className = '';
        this.parentNode = null;
    }

    addEventListener() { }
    removeEventListener() { }

    appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
        return child;
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parentNode = null;
        }
        return child;
    }

    remove() {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    }

    getBoundingClientRect() {
        return {
            left: 0,
            top: 0,
            right: 100,
            bottom: 100,
            width: 100,
            height: 100,
            x: 0,
            y: 0
        };
    }

    getContext(type) {
        if (type === '2d' || this.tagName === 'CANVAS') {
            return createMockContext();
        }
        return null;
    }

    querySelector(selector) {
        return new MockHTMLElement();
    }

    querySelectorAll(selector) {
        return [];
    }

    setAttribute(name, value) {
        this[name] = value;
    }

    getAttribute(name) {
        return this[name] || null;
    }

    click() { }
    focus() { }
    blur() { }
}

/**
 * Creates a mock document object
 */
export function createMockDocument() {
    const elements = new Map();

    return {
        getElementById: (id) => {
            if (!elements.has(id)) {
                const el = new MockHTMLElement();
                el.id = id;
                elements.set(id, el);
            }
            return elements.get(id);
        },
        querySelector: (selector) => new MockHTMLElement(),
        querySelectorAll: (selector) => [],
        createElement: (tag) => new MockHTMLElement(tag),
        createTextNode: (text) => ({ nodeValue: text, textContent: text }),
        addEventListener: () => { },
        removeEventListener: () => { },
        body: new MockHTMLElement('body'),
        head: new MockHTMLElement('head'),
        documentElement: new MockHTMLElement('html')
    };
}

/**
 * Creates a mock localStorage implementation
 */
export function createMockLocalStorage() {
    const store = {};

    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => {
            store[key] = String(value);
        },
        removeItem: (key) => {
            delete store[key];
        },
        clear: () => {
            Object.keys(store).forEach(key => delete store[key]);
        },
        get length() {
            return Object.keys(store).length;
        },
        key: (index) => {
            const keys = Object.keys(store);
            return keys[index] || null;
        }
    };
}

/**
 * Mock AudioContext class
 */
class MockAudioContext {
    constructor() {
        this.destination = {
            connect: () => { },
            disconnect: () => { }
        };
        this.currentTime = 0;
        this.sampleRate = 44100;
        this.state = 'running';
    }

    createGain() {
        return {
            connect: () => { },
            disconnect: () => { },
            gain: {
                value: 1,
                setValueAtTime: () => { },
                linearRampToValueAtTime: () => { },
                exponentialRampToValueAtTime: () => { }
            }
        };
    }

    createOscillator() {
        return {
            connect: () => { },
            disconnect: () => { },
            start: () => { },
            stop: () => { },
            type: 'sine',
            frequency: {
                value: 440,
                setValueAtTime: () => { },
                linearRampToValueAtTime: () => { },
                exponentialRampToValueAtTime: () => { }
            },
            detune: { value: 0 }
        };
    }

    createBufferSource() {
        return {
            connect: () => { },
            disconnect: () => { },
            start: () => { },
            stop: () => { },
            buffer: null,
            loop: false,
            playbackRate: { value: 1 }
        };
    }

    createBuffer(channels, length, sampleRate) {
        return {
            length,
            sampleRate,
            duration: length / sampleRate,
            numberOfChannels: channels,
            getChannelData: () => new Float32Array(length)
        };
    }

    decodeAudioData(audioData) {
        return Promise.resolve(this.createBuffer(2, 44100, 44100));
    }

    resume() {
        return Promise.resolve();
    }

    suspend() {
        return Promise.resolve();
    }

    close() {
        return Promise.resolve();
    }
}

/**
 * Creates a mock window object
 */
export function createMockWindow(width = 1024, height = 768) {
    const mockWindow = {
        innerWidth: width,
        innerHeight: height,
        devicePixelRatio: 1,
        addEventListener: () => { },
        removeEventListener: () => { },
        requestAnimationFrame: (callback) => setTimeout(callback, 16),
        cancelAnimationFrame: (id) => clearTimeout(id),
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        alert: () => { },
        confirm: () => true,
        prompt: () => '1',
        AudioContext: MockAudioContext,
        webkitAudioContext: MockAudioContext
    };

    return mockWindow;
}

/**
 * Sets up global mocks for browser APIs
 * Call this in test setup to mock DOM/browser environment
 */
export function setupGlobalMocks() {
    if (typeof document === 'undefined') {
        global.document = createMockDocument();
    }
    if (typeof window === 'undefined') {
        global.window = createMockWindow();
    }
    if (typeof localStorage === 'undefined') {
        global.localStorage = createMockLocalStorage();
    }
    if (typeof HTMLElement === 'undefined') {
        global.HTMLElement = MockHTMLElement;
    }
    if (typeof prompt === 'undefined') {
        global.prompt = () => '1';
    }
}

/**
 * Resets all mock storage state
 * Useful to call between tests
 */
export function resetMocks() {
    if (global.localStorage) {
        global.localStorage.clear();
    }
}
