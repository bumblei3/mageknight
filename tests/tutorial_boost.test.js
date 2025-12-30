import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import TutorialManager from '../js/tutorialManager.js';
import { createMockElement, createSpy, createMockLocalStorage } from './test-mocks.js';

describe('Tutorial Boost', () => {
    let tm;
    let game;
    let originalGetElementById, originalQuerySelector, originalQuerySelectorAll, originalCreateElement;

    beforeEach(() => {
        originalGetElementById = global.document.getElementById;
        originalQuerySelector = global.document.querySelector;
        originalQuerySelectorAll = global.document.querySelectorAll;
        originalCreateElement = global.document.createElement;
        global.localStorage = createMockLocalStorage();

        const elements = {};
        global.document.getElementById = (id) => {
            if (!elements[id]) {
                elements[id] = createMockElement('div');
                elements[id].id = id;
            }
            return elements[id];
        };
        global.document.querySelector = (sel) => createMockElement('div');
        global.document.querySelectorAll = (sel) => [createMockElement('div')];
        global.document.createElement = (tag) => createMockElement(tag);

        game = { ui: { addLog: createSpy() } };
        tm = new TutorialManager(game);
    });

    afterEach(() => {
        global.document.getElementById = originalGetElementById;
        global.document.querySelector = originalQuerySelector;
        global.document.querySelectorAll = originalQuerySelectorAll;
        global.document.createElement = originalCreateElement;
    });

    it('should handle highlighting missing elements', () => {
        global.document.querySelector = () => null;
        tm.createTutorialUI();
        tm.highlightElement('.invalid');
        expect(tm.spotlight.style.display).toBe('none');
    });

    it('should clear highlights correctly', () => {
        const el = createMockElement('div');
        el.dataset.tutorialHighlight = 'true';
        global.document.querySelectorAll = () => [el];
        tm.clearHighlight();
        expect(el.style.zIndex).toBe('');
    });

    it('should position box at bottom', () => {
        tm.createTutorialUI();
        tm.positionTutorialBox('bottom');
        expect(tm.tutorialBox.style.bottom).toBe('20px');
    });

    it('should handle tutorial completion and reset', () => {
        tm.createTutorialUI();
        tm.complete();
        expect(TutorialManager.hasCompleted()).toBe(true);
        TutorialManager.reset();
        expect(TutorialManager.hasCompleted()).toBe(false);
    });
});
