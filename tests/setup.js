// Global Test Setup
// Mocks DOM and other browser APIs for Node.js environment

class MockHTMLElement {
    constructor() {
        this.style = {};
        this.classList = {
            add: () => { },
            remove: () => { },
            toggle: () => { },
            contains: () => false
        };
        this.dataset = {};
        this.children = [];
        this.innerHTML = '';
        this.textContent = '';
        this.value = '';
        this.width = 800;
        this.height = 600;
    }

    addEventListener() { }
    removeEventListener() { }
    appendChild(child) { this.children.push(child); }
    querySelector(sel) { return new MockHTMLElement(); }
    querySelectorAll(sel) { return []; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; }
    getContext() {
        return {
            beginPath: () => { },
            moveTo: () => { },
            lineTo: () => { },
            closePath: () => { },
            stroke: () => { },
            fill: () => { },
            clearRect: () => { },
            save: () => { },
            restore: () => { },
            translate: () => { },
            scale: () => { },
            drawImage: () => { },
            measureText: () => ({ width: 10 }),
            fillText: () => { },
            strokeText: () => { },
            createRadialGradient: () => ({ addColorStop: () => { } }),
            createLinearGradient: () => ({ addColorStop: () => { } }),
            arc: () => { },
            arc: () => { },
            rect: () => { },
            fillRect: () => { },
            clip: () => { },
            globalAlpha: 1.0
        };
    }
}

const mockDocument = {
    getElementById: (id) => new MockHTMLElement(),
    querySelector: (sel) => new MockHTMLElement(),
    querySelectorAll: (sel) => [],
    createElement: (tag) => new MockHTMLElement(),
    addEventListener: () => { },
    body: new MockHTMLElement()
};

const mockLocalStorage = {
    store: {},
    getItem: (key) => mockLocalStorage.store[key] || null,
    setItem: (key, val) => { mockLocalStorage.store[key] = val.toString(); },
    removeItem: (key) => { delete mockLocalStorage.store[key]; },
    clear: () => { mockLocalStorage.store = {}; }
};

if (typeof document === 'undefined') {
    global.document = mockDocument;
    global.window = {
        addEventListener: () => { },
        innerWidth: 1024,
        innerHeight: 768
    };
    global.localStorage = mockLocalStorage;
    global.HTMLElement = MockHTMLElement;
    global.prompt = () => '1';
    global.navigator = { userAgent: 'node' };
    global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    global.cancelAnimationFrame = (id) => clearTimeout(id);
    global.performance = {
        now: () => Date.now()
    };
}
