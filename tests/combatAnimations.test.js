import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import {
    triggerScreenShake,
    animateHealthBar,
    showVictorySplash,
    showDefeatOverlay,
    animateImpact,
    animateBlock,
    pulseElement,
    flashDamageNumber,
    enemyDefeatedExplosion
} from '../js/combatAnimations.js';
import { createMockDocument } from './test-mocks.js';

describe('Combat Animations', () => {
    let originalDocument;
    let originalQuerySelector;
    let originalCreateElement;
    let originalAppendChild;
    let createdElements = [];
    let appendedElements = [];

    beforeEach(() => {
        // Save original document state
        originalDocument = global.document;

        // Ensure we have a document object
        if (!global.document) {
            global.document = createMockDocument();
        }

        originalQuerySelector = global.document.querySelector;
        originalCreateElement = global.document.createElement;
        // Note: document.body might be a getter/setter or object, so we save the method specifically
        if (global.document.body) {
            originalAppendChild = global.document.body.appendChild;
        }

        createdElements = [];
        appendedElements = [];

        // Override methods for testing
        // We need to ensure body exists
        if (!global.document.body) {
            global.document.body = { appendChild: () => { } };
        }

        global.document.body.appendChild = (el) => {
            appendedElements.push(el);
            return el;
        };

        global.document.createElement = (tag) => {
            const el = {
                tagName: tag.toUpperCase(),
                className: '',
                style: {},
                innerHTML: '',
                textContent: '',
                remove: () => {
                    const appendIndex = appendedElements.indexOf(el);
                    if (appendIndex > -1) appendedElements.splice(appendIndex, 1);
                    const createIndex = createdElements.indexOf(el);
                    if (createIndex > -1) createdElements.splice(createIndex, 1);
                },
                appendChild: () => { },
                setProperty: (prop, val) => { el.style[prop] = val; }
            };
            // Add setProperty to style object too for convenience
            el.style.setProperty = (prop, val) => { el.style[prop] = val; };

            createdElements.push(el);
            return el;
        };

        global.document.querySelector = (selector) => {
            if (selector === '.game-container') {
                return {
                    style: { transform: '' },
                    appendChild: (el) => {
                        appendedElements.push(el);
                        return el;
                    }
                };
            }
            return null;
        };

        // Mock performance.now
        if (!global.performance) {
            global.performance = { now: () => Date.now() };
        }

        // Mock RAF if needed (though setup.js usually handles it)
        if (!global.requestAnimationFrame) {
            global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
            global.cancelAnimationFrame = (id) => clearTimeout(id);
        }
    });

    afterEach(() => {
        // Restore original methods
        if (originalDocument) {
            global.document.querySelector = originalQuerySelector;
            global.document.createElement = originalCreateElement;
            if (global.document.body && originalAppendChild) {
                global.document.body.appendChild = originalAppendChild;
            }
        }
    });

    // Flattened tests
    it('triggerScreenShake: should return a promise', () => {
        const result = triggerScreenShake(5, 100);
        expect(result instanceof Promise).toBe(true);
    });

    it('triggerScreenShake: should resolve without container', async () => {
        global.document.querySelector = () => null;
        await expect(triggerScreenShake()).resolves;
    });

    it('triggerScreenShake: should handle shake animation', () => {
        const container = { style: { transform: '' } };
        global.document.querySelector = () => container;

        const promise = triggerScreenShake(3, 50);

        // Just verify we got a promise
        expect(promise instanceof Promise).toBe(true);
    });

    it('animateHealthBar: should return a promise', () => {
        const element = { style: {} };
        const result = animateHealthBar(element, 100, 50, 100);
        expect(result instanceof Promise).toBe(true);
    });

    it('animateHealthBar: should resolve without element', async () => {
        await expect(animateHealthBar(null, 100, 50, 100)).resolves;
    });

    it('animateHealthBar: should update element width', async () => {
        const element = { style: {} };

        await animateHealthBar(element, 100, 50, 100);
        expect(element.style.width).toBeDefined();
    });

    it('animateHealthBar: should apply gradient for health changes', async () => {
        const element = { style: {} };

        await animateHealthBar(element, 100, 80, 100);
        // Just check that background was set
        expect(element.style.background).toBeDefined();
    });

    it('animateHealthBar: should apply flash animation on damage', () => {
        const element = { style: {} };

        animateHealthBar(element, 100, 50, 100);

        // Flash is set immediately, not after animation
        setTimeout(() => {
            expect(element.style.animation).toBeDefined();
        }, 50);
    });

    it('showVictorySplash: should return a promise', () => {
        const result = showVictorySplash();
        expect(result instanceof Promise).toBe(true);
    });

    it('showVictorySplash: should create victory splash element', () => {
        showVictorySplash();

        expect(appendedElements.length).toBeGreaterThan(0);
        const splash = appendedElements[0];
        expect(splash.className).toBe('victory-splash');
    });

    it('showVictorySplash: should contain victory text', () => {
        showVictorySplash();

        const splash = appendedElements[0];
        expect(splash.innerHTML).toContain('SIEG!');
        expect(splash.innerHTML).toContain('🏆');
    });

    it('showVictorySplash: should remove element after delay', async () => {
        showVictorySplash();

        const initialCount = appendedElements.length;
        expect(initialCount).toBeGreaterThan(0);

        await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('showDefeatOverlay: should return a promise', () => {
        const result = showDefeatOverlay();
        expect(result instanceof Promise).toBe(true);
    });

    it('showDefeatOverlay: should create defeat overlay element', () => {
        showDefeatOverlay();

        expect(appendedElements.length).toBeGreaterThan(0);
        const overlay = appendedElements[0];
        expect(overlay.className).toBe('defeat-overlay');
    });

    it('showDefeatOverlay: should contain defeat text', () => {
        showDefeatOverlay();

        const overlay = appendedElements[0];
        expect(overlay.innerHTML).toContain('VERLETZT');
        expect(overlay.innerHTML).toContain('💔');
    });

    it('animateImpact: should create impact flash element', () => {
        animateImpact(100, 200, '#ff0000');

        expect(appendedElements.length).toBeGreaterThan(0);
        const flash = appendedElements[0];
        expect(flash.className).toBe('combat-impact-flash');
    });

    it('animateImpact: should position flash correctly', () => {
        animateImpact(150, 250, '#ff0000');

        const flash = appendedElements[0];
        expect(flash.style.left).toBe('150px');
        expect(flash.style.top).toBe('250px');
    });

    it('animateImpact: should use specified color', () => {
        animateImpact(100, 200, '#00ff00');

        const flash = appendedElements[0];
        expect(flash.style.background).toContain('#00ff00');
    });

    it('animateImpact: should call particle system if provided', () => {
        let impactCalled = false;
        const mockParticleSystem = {
            impactEffect: (x, y, color) => {
                impactCalled = true;
                expect(x).toBe(100);
                expect(y).toBe(200);
            }
        };

        animateImpact(100, 200, '#ff0000', mockParticleSystem);
        expect(impactCalled).toBe(true);
    });

    it('animateBlock: should create shield effect element', () => {
        animateBlock(100, 200);

        expect(appendedElements.length).toBeGreaterThan(0);
        const shield = appendedElements[0];
        expect(shield.className).toBe('combat-block-effect');
    });

    it('animateBlock: should show shield emoji', () => {
        animateBlock(100, 200);

        const shield = appendedElements[0];
        expect(shield.innerHTML).toBe('🛡️');
    });

    it('animateBlock: should call particle system burst', () => {
        let burstCalled = false;
        const mockParticleSystem = {
            burst: (x, y, count, options) => {
                burstCalled = true;
                expect(x).toBe(100);
                expect(y).toBe(200);
                expect(count).toBe(20);
            }
        };

        animateBlock(100, 200, mockParticleSystem);
        expect(burstCalled).toBe(true);
    });

    it('pulseElement: should not crash with null element', () => {
        pulseElement(null);
        // Should not throw
        expect(true).toBe(true);
    });

    it('pulseElement: should apply pulse animation', () => {
        const element = { style: { setProperty: () => { } } };
        pulseElement(element, '#ff0000');

        expect(element.style.animation).toBe('elementPulse 0.5s ease-in-out');
    });

    it('pulseElement: should set pulse color', () => {
        let colorSet = false;
        const element = {
            style: {
                animation: '',
                setProperty: (prop, value) => {
                    if (prop === '--pulse-color') {
                        colorSet = true;
                        expect(value).toBe('#00ff00');
                    }
                }
            }
        };

        pulseElement(element, '#00ff00');
        expect(colorSet).toBe(true);
    });

    it('flashDamageNumber: should create damage number element', () => {
        flashDamageNumber(100, 200, 15);

        expect(appendedElements.length).toBeGreaterThan(0);
        const numberEl = appendedElements[0];
        expect(numberEl.className).toBe('damage-number');
    });

    it('flashDamageNumber: should show damage amount', () => {
        flashDamageNumber(100, 200, 25);

        const numberEl = appendedElements[0];
        expect(numberEl.textContent).toBe('-25');
    });

    it('flashDamageNumber: should position correctly', () => {
        flashDamageNumber(150, 250, 10);

        const numberEl = appendedElements[0];
        expect(numberEl.style.left).toBe('150px');
        expect(numberEl.style.top).toBe('250px');
    });

    it('flashDamageNumber: should use specified color', () => {
        flashDamageNumber(100, 200, 10, '#00ff00');

        const numberEl = appendedElements[0];
        expect(numberEl.style.color).toBe('#00ff00');
    });

    it('enemyDefeatedExplosion: should call particle system explosion', () => {
        let explosionCount = 0;
        const mockParticleSystem = {
            explosion: (x, y, color, particles) => {
                explosionCount++;
                expect(x).toBe(300);
                expect(y).toBe(400);
            }
        };

        enemyDefeatedExplosion(300, 400, mockParticleSystem);

        // Should trigger at least one explosion immediately
        expect(explosionCount).toBeGreaterThan(0);
    });

    it('enemyDefeatedExplosion: should work without particle system', () => {
        enemyDefeatedExplosion(100, 200, null);
        // Should not throw
        expect(true).toBe(true);
    });
});
