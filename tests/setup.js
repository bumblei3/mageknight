// Global Mocks Setup for Node.js environment
// This file uses shared mock utilities from test-mocks.js to avoid duplication

import {
    MockHTMLElement,
    createMockDocument,
    createMockLocalStorage,
    createMockWindow
} from './test-mocks.js';

// Apply Mocks
if (typeof document === 'undefined') {
    const mockWindow = createMockWindow(1024, 768);

    global.document = createMockDocument();
    global.window = mockWindow;
    global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    global.cancelAnimationFrame = (id) => clearTimeout(id);
    global.localStorage = createMockLocalStorage();
    global.HTMLElement = MockHTMLElement;
    global.prompt = () => '1'; // Mock prompt
    global.navigator = {
        vibrate: () => { }
    };
    global.alert = () => { };
    global.confirm = () => true; // Mock confirm
    global.performance = { now: () => Date.now() };
    global.CustomEvent = class CustomEvent {
        constructor(type, options = {}) {
            this.type = type;
            Object.assign(this, options);
            if (!this.preventDefault) this.preventDefault = () => { };
        }
    };

    // Expose AudioContext globally for SoundManager
    global.AudioContext = mockWindow.AudioContext;
    global.webkitAudioContext = mockWindow.webkitAudioContext;
}
