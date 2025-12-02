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
    global.document = createMockDocument();
    global.window = createMockWindow(1024, 768);
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
}
