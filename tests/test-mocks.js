
/**
 * Shared mock utilities for testing
 * Provides centralized mock definitions for Canvas, DOM, and Storage APIs
 */

/**
 * Creates a spy function that tracks calls
 * @param {Function} implementation - Optional function to execute
 * @returns {Function} Spy function with tracking
 */
export function createSpy(implementationOrName) {
    const implementation = typeof implementationOrName === 'function' ? implementationOrName : () => { };
    const spy = function (...args) {
        spy.calls.push(args);
        spy.callCount++;
        spy.called = true;
        const result = implementation(...args);
        spy.returnValues.push(result);
        return result;
    };

    spy.calls = [];
    spy.callCount = 0;
    spy.called = false;
    spy.returnValues = [];
    spy.reset = () => {
        spy.calls = [];
        spy.callCount = 0;
        spy.called = false;
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
 * Deterministic Pseudo-Random Number Generator
 * @param {number} seed - Initial seed
 * @returns {Function} Function that returns 0..1
 */
export function createPRNG(seed = 12345) {
    let s = seed;
    return function () {
        let t = s += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

let originalRandom = Math.random;
let currentPRNG = null;

/**
 * Sets a seed for Math.random() override
 * @param {number} seed - Seed value
 */
export function setRandomSeed(seed) {
    currentPRNG = createPRNG(seed);
    Math.random = currentPRNG;
}

/**
 * Restores original Math.random()
 */
export function restoreRandom() {
    Math.random = originalRandom;
    currentPRNG = null;
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
        fillText: createSpy(),
        strokeText: createSpy(),
        measureText: createSpy((text) => ({ width: text.length * 8 })),
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

export function createMockUI() {
    return {
        addLog: createSpy('addLog'),
        showToast: createSpy('showToast'),
        updateHeroStats: createSpy(),
        formatEffect: createSpy(() => ''),
        addPlayedCard: createSpy(),
        showPlayArea: createSpy(),
        reset: createSpy(),
        showSiteModal: createSpy(), // Added
        showSiteInteraction: createSpy(),
        updateCombatTotals: createSpy(), // Added
        updateMovementPoints: createSpy(),
        renderUnits: createSpy(),
        renderHandCards: createSpy(),
        renderManaSource: createSpy(),
        setButtonEnabled: createSpy(),
        elements: {
            endTurnBtn: { addEventListener: createSpy() },
            restBtn: { addEventListener: createSpy() },
            exploreBtn: { addEventListener: createSpy() },
            newGameBtn: { addEventListener: createSpy() },
            playedCards: { getBoundingClientRect: () => ({ top: 0, left: 0, right: 100, bottom: 100 }) },
            handCards: { getBoundingClientRect: () => ({ top: 0, left: 0, right: 100, bottom: 100 }) }
        },
        tooltipManager: {
            hideTooltip: createSpy(),
            showEnemyTooltip: createSpy(),
            showTerrainTooltip: createSpy(),
            createStatTooltipHTML: createSpy(() => '<div>Tooltip</div>'),
            register: createSpy()
        }
    };
}

/**
 * Creates a mock HTML element
 */
export function createMockElement(tagName = 'div') {
    return new MockHTMLElement(tagName);
}

/**
 * Mock HTMLElement class
 */
export class MockHTMLElement {
    constructor(tagName = 'div') {
        this.tagName = tagName.toUpperCase();
        this.style = {
            setProperty: (prop, val) => { this.style[prop] = val; },
            getPropertyValue: (prop) => this.style[prop] || ''
        };
        this._listeners = new Map();
        const self = this;
        this.classList = {
            add: (...classes) => {
                self._classes = self._classes || new Set();
                classes.forEach(c => self._classes.add(c));
                self._className = Array.from(self._classes).join(' ');
            },
            remove: (...classes) => {
                self._classes = self._classes || new Set();
                classes.forEach(c => self._classes.delete(c));
                self._className = Array.from(self._classes).join(' ');
            },
            contains: (className) => {
                self._classes = self._classes || new Set();
                return self._classes.has(className);
            },
            toggle: (className) => {
                self._classes = self._classes || new Set();
                if (self._classes.has(className)) {
                    self._classes.delete(className);
                } else {
                    self._classes.add(className);
                }
                self._className = Array.from(self._classes).join(' ');
            }
        };
        this.dataset = {};
        this.parentId = null;
        this.children = [];
        this.value = '';
        this.id = '';
        this._className = '';
        this._classes = new Set();
        this.parentNode = null;
        this._innerHTML = '';
    }

    get listeners() {
        const result = [];
        this._listeners.forEach((callbacks, type) => {
            callbacks.forEach(handler => {
                result.push({ type, handler });
            });
        });
        return result;
    }

    get className() {
        return this._className;
    }

    set className(val) {
        this._className = val;
        this._classes = new Set(val.split(' ').filter(c => c));
    }

    get firstChild() {
        return this.children.length > 0 ? this.children[0] : null;
    }

    get firstElementChild() {
        return this.children.length > 0 ? this.children[0] : null;
    }

    get lastElementChild() {
        return this.children.length > 0 ? this.children[this.children.length - 1] : null;
    }

    get childElementCount() {
        return this.children.length;
    }

    get innerHTML() {
        if (this._innerHTML) return this._innerHTML;
        return this.children.map(child => {
            if (typeof child === 'string') return child;
            return child.outerHTML || child.innerHTML || '';
        }).join('');
    }

    set innerHTML(html) {
        this._innerHTML = html;
        this.children = []; // Clear existing children

        if (!html || typeof html !== 'string') return;

        // More robust mock parsing for ids, classes, and content
        // Matches tags and tries to find attributes and content
        const tagRegex = /<(div|span|button|section|h3|p)\b([^>]*?)>([\s\S]*?)<\/\1>/gi;
        let match;
        while ((match = tagRegex.exec(html)) !== null) {
            const tagName = match[1];
            const attrs = match[2];
            const content = match[3];

            const el = new MockHTMLElement(tagName);

            // Generic attribute parsing
            const attrRegex = /([a-zA-Z0-9-]+)="([^"]+)"/g;
            let attrMatch;
            while ((attrMatch = attrRegex.exec(attrs)) !== null) {
                const name = attrMatch[1];
                const value = attrMatch[2];
                if (name === 'id') el.id = value;
                else if (name === 'class') el.className = value;
                else if (name.startsWith('data-')) {
                    const prop = name.substring(5).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    el.dataset[prop] = value;
                } else {
                    el.setAttribute(name, value);
                }
            }

            // Recursively parse content
            el.innerHTML = content;

            this.appendChild(el);
        }

        // Basic mock: if setting to empty string, clear children
        if (html === '') {
            this.children = [];
            this._textContent = '';
        }
    }

    get textContent() {
        if (this._textContent) return this._textContent;
        if (this.children.length > 0) {
            return this.children.map(child => {
                if (typeof child === 'string') return child;
                return child.textContent || '';
            }).join('');
        }
        return (this._innerHTML || '').replace(/<[^>]*>/g, '');
    }

    set textContent(text) {
        this._textContent = text !== null && text !== undefined ? String(text) : '';
        this.children = []; // Setting textContent clears children in real DOM
    }

    addEventListener(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push(callback);
    }

    removeEventListener(event, callback) {
        if (!this._listeners.has(event)) return;
        const listeners = this._listeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    dispatchEvent(event) {
        const type = event.type;
        if (this._listeners.has(type)) {
            this._listeners.get(type).forEach(cb => {
                try {
                    cb(event);
                } catch (e) {
                    console.error('Error in mock listener:', e);
                }
            });
        }

        // Also check for on[type] properties
        const onHandler = this[`on${type}`];
        if (typeof onHandler === 'function') {
            try {
                onHandler(event);
            } catch (e) {
                console.error(`Error in mock on${type} handler:`, e);
            }
        }

        return true;
    }

    click() {
        console.log(`[MockElement] .click() called on ${this.id || this.tagName}`);
        this.dispatchEvent({ type: 'click', target: this, preventDefault: () => { } });
    }

    appendChild(child) {
        this.children.push(child);
        try {
            child.parentNode = this;
        } catch (e) { /* ignore read-only */ }
        return child;
    }

    insertBefore(newNode, referenceNode) {
        const index = this.children.indexOf(referenceNode);
        if (index > -1) {
            this.children.splice(index, 0, newNode);
        } else {
            this.children.push(newNode); // Fallback to append if ref not found
        }
        try {
            newNode.parentNode = this;
        } catch (e) { /* ignore read-only */ }
        return newNode;
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
        if (!selector) return null;
        const findIn = (parent) => {
            if (!parent || !parent.children || !Array.isArray(parent.children)) return null;
            for (const child of parent.children) {
                if (typeof child === 'string') continue;
                if (selector.startsWith('#') && child.id === selector.substring(1)) return child;
                if (selector.startsWith('.') && child.classList && child.classList.contains && child.classList.contains(selector.substring(1))) return child;
                if (child.tagName === selector.toUpperCase()) return child;
                const found = findIn(child);
                if (found) return found;
            }
            return null;
        };
        const found = findIn(this);
        if (found) return found;

        // Return a dummy element to avoid null pointer errors
        const dummy = new MockHTMLElement();
        if (selector.startsWith('#')) dummy.id = selector.substring(1);
        else if (selector.startsWith('.')) dummy.className = selector.substring(1);
        return dummy;
    }

    querySelectorAll(selector) {
        if (!selector) return [];
        const results = [];
        const findAllIn = (parent) => {
            if (!parent || !parent.children || !Array.isArray(parent.children)) return;
            for (const child of parent.children) {
                if (typeof child === 'string') continue;
                if (selector.startsWith('#') && child.id === selector.substring(1)) results.push(child);
                else if (selector.startsWith('.') && child.classList && child.classList.contains && child.classList.contains(selector.substring(1))) results.push(child);
                else if (child.tagName === selector.toUpperCase()) results.push(child);
                else if (selector.startsWith('[') && selector.endsWith(']')) {
                    const [attr, val] = selector.substring(1, selector.length - 1).split('=');
                    const cleanVal = val ? val.replace(/["']/g, '') : null;
                    if (attr.startsWith('data-')) {
                        const dataProp = attr.substring(5).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                        if (child.dataset[dataProp] === cleanVal || (cleanVal === null && child.dataset[dataProp] !== undefined)) {
                            results.push(child);
                        }
                    } else if (child[attr] === cleanVal || (cleanVal === null && child[attr] !== undefined)) {
                        results.push(child);
                    }
                }
                findAllIn(child);
            }
        };
        findAllIn(this);
        return results;
    }

    setAttribute(name, value) {
        if (name === 'style') {
            // Parse style string and set properties on the style object
            String(value).split(';').forEach(rule => {
                const [prop, val] = rule.split(':').map(s => s.trim());
                if (prop && val) this.style[prop] = val;
            });
        } else {
            this[name] = value;
        }
    }

    getAttribute(name) {
        return this[name] || null;
    }

    focus() { }
    blur() { }
    scrollIntoView() { }

    cloneNode(deep) {
        const clone = new MockHTMLElement(this.tagName.toLowerCase());
        clone.id = this.id;
        clone.className = this.className;
        clone.value = this.value;
        clone._innerHTML = this._innerHTML;
        // Copy other properties/datasets if needed
        if (deep) {
            this.children.forEach(child => {
                if (child.cloneNode) {
                    clone.appendChild(child.cloneNode(true));
                }
            });
        }
        return clone;
    }

    replaceWith(newNode) {
        if (this.parentNode) {
            const index = this.parentNode.children.indexOf(this);
            if (index > -1) {
                this.parentNode.children[index] = newNode;
                newNode.parentNode = this.parentNode;
                this.parentNode = null;
            }
        }
    }

    closest(selector) {
        if (!selector.startsWith('.')) return null;
        const className = selector.substring(1);

        let el = this;
        while (el) {
            if (el.classList.contains(className)) return el;
            el = el.parentNode;
        }
        return null;
    }

    get width() { return this._width || 0; }
    set width(v) { this._width = v; }
    get height() { return this._height || 0; }
    set height(v) { this._height = v; }

    get parentElement() { return this.parentNode; }
}

/**
 * Creates a mock document object
 */
export function createMockDocument() {
    const elements = new Map();
    const listeners = {};

    const doc = {
        getElementById: (id) => {
            // Search in body
            const findIn = (parent) => {
                if (parent.id === id) return parent;
                if (!parent.children) {
                    // Handle text nodes or other non-element children if any
                    return null;
                }
                for (const child of parent.children) {
                    const found = findIn(child);
                    if (found) return found;
                }
                return null;
            };

            const found = findIn(doc.body);
            if (found) return found;

            // Fallback for tests expecting auto-creation (legacy behavior preservation)
            if (!elements.has(id)) {
                const el = new MockHTMLElement();
                el.id = id;
                // Append to body to ensure it's in the tree
                doc.body.appendChild(el);
                elements.set(id, el);
            }
            return elements.get(id);
        },
        _clearListeners: () => {
            Object.keys(listeners).forEach(key => delete listeners[key]);
        },
        _clearElements: () => {
            elements.clear();
            doc.body.children = [];
        },
        querySelector: (selector) => doc.body.querySelector(selector),
        querySelectorAll: (selector) => doc.body.querySelectorAll(selector),
        createElement: (tag) => new MockHTMLElement(tag),
        createTextNode: (text) => ({ nodeValue: text, textContent: text }),
        addEventListener: (event, callback) => {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(callback);
        },
        removeEventListener: (event, callback) => {
            if (!listeners[event]) return;
            listeners[event] = listeners[event].filter(cb => cb !== callback);
        },
        dispatchEvent: (event) => {
            const type = typeof event === 'string' ? event : event.type;
            if (listeners[type]) {
                listeners[type].forEach(cb => cb(event));
            }
            return true;
        },
        body: new MockHTMLElement('body'),
        head: new MockHTMLElement('head'),
        documentElement: new MockHTMLElement('html'),
        activeElement: { tagName: 'BODY' } // Added default
    };
    return doc;
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
 * Mock CustomEvent class
 */
export class MockCustomEvent {
    constructor(type, options = {}) {
        this.type = type;
        Object.assign(this, options);
        if (!this.preventDefault) this.preventDefault = () => { };
    }
}

/**
 * Mock MouseEvent class
 */
export class MockMouseEvent extends MockCustomEvent {
    constructor(type, options = {}) {
        super(type, options);
        this.clientX = options.clientX || 0;
        this.clientY = options.clientY || 0;
        this.button = options.button || 0;
    }
}

/**
 * Mock KeyboardEvent class
 */
export class MockKeyboardEvent extends MockCustomEvent {
    constructor(type, options = {}) {
        super(type, options);
        this.key = options.key || '';
        this.code = options.code || '';
        this.ctrlKey = !!options.ctrlKey;
        this.metaKey = !!options.metaKey;
        this.shiftKey = !!options.shiftKey;
        this.altKey = !!options.altKey;
        this.target = options.target || (global.document ? global.document.body : null);
    }
}

/**
 * Creates a mock window object
 */
export function createMockWindow(width = 1024, height = 768) {
    const listeners = {};
    const mockWindow = {
        innerWidth: width,
        innerHeight: height,
        devicePixelRatio: 1,
        addEventListener: (event, callback) => {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(callback);
        },
        removeEventListener: (event, callback) => {
            if (!listeners[event]) return;
            listeners[event] = listeners[event].filter(cb => cb !== callback);
        },
        dispatchEvent: (event) => {
            const type = typeof event === 'string' ? event : event.type;
            if (listeners[type]) {
                listeners[type].forEach(cb => cb(event));
            }
        },
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
        webkitAudioContext: MockAudioContext,
        _clearListeners: () => {
            Object.keys(listeners).forEach(key => delete listeners[key]);
        },
        getComputedStyle: () => ({
            getPropertyValue: () => '',
            opacity: '1',
            display: 'block'
        })
    };

    return mockWindow;
}

/**
 * Sets up global mocks for browser APIs
 * Call this in test setup to mock DOM/browser environment
 */
export function setupGlobalMocks() {
    global.document = createMockDocument();
    global.window = createMockWindow();
    global.localStorage = createMockLocalStorage();
    global.HTMLElement = MockHTMLElement;
    global.CustomEvent = MockCustomEvent;
    global.MouseEvent = MockMouseEvent;
    global.KeyboardEvent = MockKeyboardEvent;

    if (typeof prompt === 'undefined' || (global.prompt && global.prompt.toString().includes('native'))) {
        global.prompt = () => '1';
    }

    // Default seed for deterministic tests
    setRandomSeed(42);

    // Global test flag for game detection
    if (global.window) global.window.isTest = true;
}

/**
 * Creates the standard DOM structure required by the game's UI class
 * @returns {Object} References to the created elements
 */
export function setupStandardGameDOM() {
    if (!global.document || !global.document.body) return null;

    global.document.body.innerHTML = '';

    const elements = {};
    const ids = [
        // Stats
        'fame-value', 'reputation-value', 'hero-name', 'hero-armor',
        'hero-handlimit', 'hero-wounds', 'movement-points',
        // Buttons
        'end-turn-btn', 'rest-btn', 'explore-btn', 'new-game-btn', 'heal-btn',
        // Areas
        'hand-cards', 'played-cards', 'play-area', 'mana-source',
        'game-log', 'combat-panel', 'combat-info', 'combat-units', 'hero-units',
        // Canvas
        'game-board',
        // Containers
        'ui-container', 'toast-container', 'card-viewer'
    ];

    ids.forEach(id => {
        const el = global.document.createElement('div');
        el.id = id;
        global.document.body.appendChild(el);
        elements[id] = el;

        // Also add camelCase version for code that expects it: hero-name -> heroName
        const camelId = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        if (camelId !== id) {
            elements[camelId] = el;
        }
    });

    // Specialized structures
    const canvas = global.document.getElementById('game-board');
    if (canvas) {
        canvas.width = 800;
        canvas.height = 600;
    }

    // Site Modal Structure
    const siteModal = global.document.getElementById('site-modal') || global.document.createElement('div');
    siteModal.id = 'site-modal';
    siteModal.innerHTML = `
        <div id="site-close"></div>
        <div id="site-modal-icon"></div>
        <h2 id="site-modal-title"></h2>
        <p id="site-modal-description"></p>
        <div id="site-options"></div>
        <button id="site-close-btn"></button>
    `;
    global.document.body.appendChild(siteModal);

    // Level Up Modal Structure
    const levelUpModal = global.document.getElementById('level-up-modal') || global.document.createElement('div');
    levelUpModal.id = 'level-up-modal';
    levelUpModal.innerHTML = `
        <div id="new-level-display"></div>
        <div id="skill-choices"></div>
        <div id="card-choices"></div>
        <button id="confirm-level-up"></button>
    `;
    global.document.body.appendChild(levelUpModal);

    // Card Play Modal Structure
    const cardPlayModal = global.document.getElementById('card-play-modal') || global.document.createElement('div');
    cardPlayModal.id = 'card-play-modal';
    cardPlayModal.innerHTML = `
        <div id="basic-effect-desc"></div>
        <div id="strong-effect-desc"></div>
        <div id="strong-cost-desc"></div>
        <button id="play-basic-btn"></button>
        <button id="play-strong-btn"></button>
        <button id="card-play-close"></button>
    `;
    global.document.body.appendChild(cardPlayModal);

    // Reset Modal Structure
    const resetModal = global.document.getElementById('reset-modal') || global.document.createElement('div');
    resetModal.id = 'reset-modal';
    resetModal.innerHTML = `
        <button id="confirm-reset-btn"></button>
        <button id="cancel-reset-btn"></button>
    `;
    global.document.body.appendChild(resetModal);

    return elements;
}

/**
 * Resets all mock storage state and DOM environment
 * Useful to call between tests to prevent memory leaks
 */
export function resetMocks() {
    if (global.localStorage) {
        global.localStorage.clear();
    }

    if (global.document) {
        setupStandardGameDOM();

        // If the mock body has an internal listener storage, clear it
        if (global.document.body && global.document.body._listeners && global.document.body._listeners.clear) {
            global.document.body._listeners.clear();
        }

        // Reset document level listeners and elements if it was created with createMockDocument
        if (global.document._clearListeners) {
            global.document._clearListeners();
        }
        if (global.document._clearElements) {
            global.document._clearElements();
        }
    }

    if (global.window && global.window._clearListeners) {
        global.window._clearListeners();
    }
}
