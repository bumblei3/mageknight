import { describe, it, expect, beforeEach } from './testRunner.js';
import { ParticleSystem, Particle } from '../js/particles.js';
import { createMockContext } from './test-mocks.js';

describe('Particle System', () => {
    let particleSystem;
    let mockCanvas;
    let mockCtx;

    beforeEach(() => {
        mockCtx = createMockContext();
        mockCanvas = {
            getContext: () => mockCtx,
            width: 800,
            height: 600
        };
        particleSystem = new ParticleSystem(mockCanvas);
    });

    it('should initialize correctly', () => {
        expect(particleSystem.particles).toEqual([]);
        expect(particleSystem.floatingTexts).toEqual([]);
        expect(particleSystem.isRunning).toBe(false);
    });

    it('should add particles', () => {
        particleSystem.addParticle(100, 100, {});
        expect(particleSystem.particles.length).toBe(1);
        expect(particleSystem.isRunning).toBe(true);
    });

    it('should respect max particles limit', () => {
        for (let i = 0; i < ParticleSystem.MAX_PARTICLES + 50; i++) {
            particleSystem.addParticle(100, 100, {});
        }
        expect(particleSystem.particles.length).toBeLessThanOrEqual(ParticleSystem.MAX_PARTICLES);
    });

    describe('Screen Shake', () => {
        it('should trigger shake', () => {
            particleSystem.triggerShake(5, 0.5);
            expect(particleSystem.shakeMagnitude).toBe(5);
            expect(particleSystem.shakeTime).toBe(0.5);
            expect(particleSystem.isRunning).toBe(true);
        });

        it('should update shake over time', () => {
            particleSystem.triggerShake(5, 0.5);

            // Mock time update
            const initialTime = particleSystem.shakeTime;

            // Manually trigger an update frame with delta time ~16ms (1 frame at 60fps)
            // But update() calculates delta internally based on performance.now().
            // We can mock performance.now behavior or just call update if we could control deltaTime.
            // ParticleSystem.update() calculates deltaTime.

            // Let's rely on internal state change after one update call
            // We need to advance time for performance.now()
            const start = performance.now();

            // Stub performance.now to advance time
            const originalNow = performance.now;
            let time = 1000;
            global.performance = { now: () => time };

            particleSystem.lastTime = 1000;
            time = 1016; // +16ms

            particleSystem.update();

            expect(particleSystem.shakeTime).toBeLessThan(initialTime);

            // Restore
            global.performance.now = originalNow;
        });

        it('should apply translation during draw when shaking', () => {
            particleSystem.triggerShake(5, 0.5);
            // manually set offsets to be sure
            particleSystem.shakeOffsetX = 10;
            particleSystem.shakeOffsetY = 10;

            particleSystem.draw();

            // Verify translate was called
            const calls = mockCtx.translate.calls; // Access .calls directly
            expect(calls.length).toBeGreaterThan(0);
        });
    });

    describe('Floating Text', () => {
        it('should create floating text', () => {
            particleSystem.createFloatingText(100, 100, '10 Damage', '#ff0000');
            expect(particleSystem.floatingTexts.length).toBe(1);
            expect(particleSystem.floatingTexts[0].text).toBe('10 Damage');
            expect(particleSystem.isRunning).toBe(true);
        });

        it('should create damage number alias', () => {
            particleSystem.createDamageNumber(100, 100, 25, true);
            expect(particleSystem.floatingTexts.length).toBe(1);
            expect(particleSystem.floatingTexts[0].text).toBe('25');
        });

        it('should update and remove dead text', () => {
            particleSystem.createFloatingText(100, 100, 'Test');
            const text = particleSystem.floatingTexts[0];
            text.life = -0.1; // Kill it

            // Stub performance.now needed for update
            const originalNow = performance.now;
            global.performance = { now: () => 1000 };
            particleSystem.lastTime = 900;

            // Ensure update removes it.
            // floatingTexts filter logic: this.floatingTexts = this.floatingTexts.filter(ft => ft.update());
            // ft.update returns this.life > 0.
            // If life is -0.1, it returns false.

            particleSystem.update();

            expect(particleSystem.floatingTexts.length).toBe(0);

            global.performance.now = originalNow;
        });

        it('should draw floating text', () => {
            particleSystem.createFloatingText(100, 100, 'DrawMe');
            particleSystem.draw();

            // Check calls to fillText
            const calls = mockCtx.fillText.calls;
            expect(calls.length).toBeGreaterThan(0);
            expect(calls.some(c => c[0] === 'DrawMe')).toBe(true);
        });
    });
});
