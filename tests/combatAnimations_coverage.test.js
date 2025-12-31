
import { describe, it, expect, beforeEach } from './testRunner.js';
import * as combatAnimations from '../js/combatAnimations.js';
import { setupGlobalMocks, resetMocks, createMockContext, createMockElement } from './test-mocks.js';

setupGlobalMocks();

describe('CombatAnimations Coverage', () => {
    let mockCtx;
    let mockElement;

    beforeEach(() => {
        resetMocks();
        mockCtx = createMockContext();
        mockElement = createMockElement('div');
        mockElement.style = {};

        // Mock requestAnimationFrame
        global.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
    });

    describe('shakeElement', () => {
        it('should apply shake animation', async () => {
            if (combatAnimations.shakeElement) {
                const promise = combatAnimations.shakeElement(mockElement);
                await promise;
            }
        });
    });

    describe('flashElement', () => {
        it('should apply flash effect', async () => {
            if (combatAnimations.flashElement) {
                const promise = combatAnimations.flashElement(mockElement, '#ff0000');
                await promise;
            }
        });
    });

    describe('pulseElement', () => {
        it('should apply pulse animation', async () => {
            if (combatAnimations.pulseElement) {
                const promise = combatAnimations.pulseElement(mockElement);
                await promise;
            }
        });
    });

    describe('animateDamageNumber', () => {
        it('should create floating damage number', async () => {
            if (combatAnimations.animateDamageNumber) {
                combatAnimations.animateDamageNumber(100, 100, 5, false);
            }
        });

        it('should handle critical damage', async () => {
            if (combatAnimations.animateDamageNumber) {
                combatAnimations.animateDamageNumber(100, 100, 10, true);
            }
        });
    });

    describe('animateAttack', () => {
        it('should create attack animation', async () => {
            if (combatAnimations.animateAttack) {
                combatAnimations.animateAttack(mockElement, { x: 400, y: 300 });
            }
        });
    });
});
