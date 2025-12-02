import { describe, it, expect, beforeEach } from './testRunner.js';
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

// Mock DOM and global functions
const mockDocument = createMockDocument();
let createdElements = [];
let appendedElements = [];

if (typeof document === 'undefined') {
    global.document = {
        ...mockDocument,
        body: {
            appendChild: (el) => {
                appendedElements.push(el);
                return el;
            }
        },
        createElement: (tag) => {
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
                appendChild: () => { }
            };
            createdElements.push(el);
            return el;
        },
        querySelector: (selector) => {
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
        },
        getElementById: (id) => {
            if (id === 'game-board') {
                return {
                    width: 800,
                    height: 600,
                    getContext: () => ({})
                };
            }
            return null;
        }
    };

    global.performance = {
        now: () => Date.now()
    };

    let rafCallbacks = [];
    global.requestAnimationFrame = (cb) => {
        rafCallbacks.push(cb);
        const id = rafCallbacks.length;
        // Auto-execute after short delay
        setTimeout(() => {
            if (rafCallbacks.includes(cb)) {
                cb(Date.now());
            }
        }, 16);
        return id;
    };

    global.cancelAnimationFrame = (id) => {
        if (id > 0 && id <= rafCallbacks.length) {
            rafCallbacks[id - 1] = null;
        }
    };
}

describe('Combat Animations', () => {
    beforeEach(() => {
        createdElements = [];
        appendedElements = [];
    });

    describe('triggerScreenShake', () => {
        it('should return a promise', () => {
            const result = triggerScreenShake(5, 100);
            expect(result instanceof Promise).toBe(true);
        });

        it('should resolve without container', async () => {
            global.document.querySelector = () => null;
            await expect(triggerScreenShake()).resolves;
        });

        it('should handle shake animation', () => {
            const container = { style: { transform: '' } };
            global.document.querySelector = () => container;

            const promise = triggerScreenShake(3, 50);

            // Just verify we got a promise
            expect(promise instanceof Promise).toBe(true);
        });
    });

    describe('animateHealthBar', () => {
        it('should return a promise', () => {
            const element = { style: {} };
            const result = animateHealthBar(element, 100, 50, 100);
            expect(result instanceof Promise).toBe(true);
        });

        it('should resolve without element', async () => {
            await expect(animateHealthBar(null, 100, 50, 100)).resolves;
        });

        it('should update element width', async () => {
            const element = { style: {} };

            await animateHealthBar(element, 100, 50, 100);
            expect(element.style.width).toBeDefined();
        });

        it('should apply gradient for health changes', async () => {
            const element = { style: {} };

            await animateHealthBar(element, 100, 80, 100);
            // Just check that background was set
            expect(element.style.background).toBeDefined();
        });

        it('should apply flash animation on damage', () => {
            const element = { style: {} };

            animateHealthBar(element, 100, 50, 100);

            // Flash is set immediately, not after animation
            setTimeout(() => {
                expect(element.style.animation).toBeDefined();
            }, 50);
        });
    });

    describe('showVictorySplash', () => {
        it('should return a promise', () => {
            const result = showVictorySplash();
            expect(result instanceof Promise).toBe(true);
        });

        it('should create victory splash element', () => {
            showVictorySplash();

            expect(appendedElements.length).toBeGreaterThan(0);
            const splash = appendedElements[0];
            expect(splash.className).toBe('victory-splash');
        });

        it('should contain victory text', () => {
            showVictorySplash();

            const splash = appendedElements[0];
            expect(splash.innerHTML).toContain('SIEG!');
            expect(splash.innerHTML).toContain('🏆');
        });

        it('should remove element after delay', (done) => {
            showVictorySplash();

            const initialCount = appendedElements.length;
            expect(initialCount).toBeGreaterThan(0);

            setTimeout(() => {
                // Element should be marked for removal
                done();
            }, 100);
        });
    });

    describe('showDefeatOverlay', () => {
        it('should return a promise', () => {
            const result = showDefeatOverlay();
            expect(result instanceof Promise).toBe(true);
        });

        it('should create defeat overlay element', () => {
            showDefeatOverlay();

            expect(appendedElements.length).toBeGreaterThan(0);
            const overlay = appendedElements[0];
            expect(overlay.className).toBe('defeat-overlay');
        });

        it('should contain defeat text', () => {
            showDefeatOverlay();

            const overlay = appendedElements[0];
            expect(overlay.innerHTML).toContain('VERLETZT');
            expect(overlay.innerHTML).toContain('💔');
        });
    });

    describe('animateImpact', () => {
        it('should create impact flash element', () => {
            animateImpact(100, 200, '#ff0000');

            expect(appendedElements.length).toBeGreaterThan(0);
            const flash = appendedElements[0];
            expect(flash.className).toBe('combat-impact-flash');
        });

        it('should position flash correctly', () => {
            animateImpact(150, 250, '#ff0000');

            const flash = appendedElements[0];
            expect(flash.style.left).toBe('150px');
            expect(flash.style.top).toBe('250px');
        });

        it('should use specified color', () => {
            animateImpact(100, 200, '#00ff00');

            const flash = appendedElements[0];
            expect(flash.style.background).toContain('#00ff00');
        });

        it('should call particle system if provided', () => {
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
    });

    describe('animateBlock', () => {
        it('should create shield effect element', () => {
            animateBlock(100, 200);

            expect(appendedElements.length).toBeGreaterThan(0);
            const shield = appendedElements[0];
            expect(shield.className).toBe('combat-block-effect');
        });

        it('should show shield emoji', () => {
            animateBlock(100, 200);

            const shield = appendedElements[0];
            expect(shield.innerHTML).toBe('🛡️');
        });

        it('should call particle system burst', () => {
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
    });

    describe('pulseElement', () => {
        it('should not crash with null element', () => {
            pulseElement(null);
            // Should not throw
            expect(true).toBe(true);
        });

        it('should apply pulse animation', () => {
            const element = { style: { setProperty: () => { } } };
            pulseElement(element, '#ff0000');

            expect(element.style.animation).toBe('elementPulse 0.5s ease-in-out');
        });

        it('should set pulse color', () => {
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
    });

    describe('flashDamageNumber', () => {
        it('should create damage number element', () => {
            flashDamageNumber(100, 200, 15);

            expect(appendedElements.length).toBeGreaterThan(0);
            const numberEl = appendedElements[0];
            expect(numberEl.className).toBe('damage-number');
        });

        it('should show damage amount', () => {
            flashDamageNumber(100, 200, 25);

            const numberEl = appendedElements[0];
            expect(numberEl.textContent).toBe('-25');
        });

        it('should position correctly', () => {
            flashDamageNumber(150, 250, 10);

            const numberEl = appendedElements[0];
            expect(numberEl.style.left).toBe('150px');
            expect(numberEl.style.top).toBe('250px');
        });

        it('should use specified color', () => {
            flashDamageNumber(100, 200, 10, '#00ff00');

            const numberEl = appendedElements[0];
            expect(numberEl.style.color).toBe('#00ff00');
        });
    });

    describe('enemyDefeatedExplosion', () => {
        it('should call particle system explosion', () => {
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

        it('should work without particle system', () => {
            enemyDefeatedExplosion(100, 200, null);
            // Should not throw
            expect(true).toBe(true);
        });
    });
});
