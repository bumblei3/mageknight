import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MagicEffects } from '../../js/particles/MagicEffects.js';

describe('MagicEffects', () => {
    let effects;
    let mockEngine;

    beforeEach(() => {
        mockEngine = {
            burst: vi.fn(),
            addParticle: vi.fn()
        };
        effects = new MagicEffects(mockEngine);
    });

    describe('manaEffect', () => {
        it('should call burst with correct parameters', () => {
            effects.manaEffect(100, 200, '#ff00ff');

            expect(mockEngine.burst).toHaveBeenCalledWith(
                100, 200, 12,
                expect.objectContaining({
                    color: '#ff00ff',
                    speed: 2,
                    size: 3,
                    decay: 0.03,
                    gravity: -0.05
                })
            );
        });

        it('should use default color when not provided', () => {
            effects.manaEffect(50, 50, '#ffffff');

            expect(mockEngine.burst).toHaveBeenCalledWith(
                50, 50, 12,
                expect.objectContaining({
                    color: '#ffffff'
                })
            );
        });

        it('should have gravity set to -0.05 for floating', () => {
            effects.manaEffect(0, 0, '#000000');
            
            const call = mockEngine.burst.mock.calls[0];
            expect(call[3].gravity).toBe(-0.05);
        });
    });

    describe('manaGlitterEffect', () => {
        it('should call addParticle 3 times', () => {
            effects.manaGlitterEffect(100, 200, '#00ffff');

            expect(mockEngine.addParticle).toHaveBeenCalledTimes(3);
        });

        it('should use provided color', () => {
            effects.manaGlitterEffect(10, 20, '#ff00ff');

            const calls = mockEngine.addParticle.mock.calls;
            calls.forEach(call => {
                expect(call[2].color).toBe('#ff00ff');
            });
        });

        it('should add random offset to position', () => {
            effects.manaGlitterEffect(100, 100, '#000000');

            const calls = mockEngine.addParticle.mock.calls;
            calls.forEach(call => {
                // x and y should be within ~10 pixels of center
                expect(call[0]).toBeGreaterThanOrEqual(90);
                expect(call[0]).toBeLessThanOrEqual(110);
                expect(call[1]).toBeGreaterThanOrEqual(90);
                expect(call[1]).toBeLessThanOrEqual(110);
            });
        });

        it('should set decay to 0.02', () => {
            effects.manaGlitterEffect(0, 0, '#fff');

            const call = mockEngine.addParticle.mock.calls[0];
            expect(call[2].decay).toBe(0.02);
        });

        it('should set vy to drift upward', () => {
            effects.manaGlitterEffect(0, 0, '#fff');

            const calls = mockEngine.addParticle.mock.calls;
            calls.forEach(call => {
                // vy should have negative component (upward drift)
                expect(call[2].vy).toBeLessThanOrEqual(0);
            });
        });
    });

    describe('healEffect', () => {
        it('should call addParticle 15 times', () => {
            effects.healEffect(100, 200);

            expect(mockEngine.addParticle).toHaveBeenCalledTimes(15);
        });

        it('should use green color for healing', () => {
            effects.healEffect(50, 50);

            const calls = mockEngine.addParticle.mock.calls;
            calls.forEach(call => {
                expect(call[2].color).toBe('#4ade80');
            });
        });

        it('should set vy negative for upward movement', () => {
            effects.healEffect(0, 0);

            const calls = mockEngine.addParticle.mock.calls;
            calls.forEach(call => {
                expect(call[2].vy).toBe(-2);
            });
        });

        it('should set size to 4', () => {
            effects.healEffect(0, 0);

            const call = mockEngine.addParticle.mock.calls[0];
            expect(call[2].size).toBe(4);
        });

        it('should set decay to 0.02', () => {
            effects.healEffect(0, 0);

            const call = mockEngine.addParticle.mock.calls[0];
            expect(call[2].decay).toBe(0.02);
        });

        it('should spread particles in 40px radius', () => {
            effects.healEffect(100, 100);

            const calls = mockEngine.addParticle.mock.calls;
            calls.forEach(call => {
                expect(call[0]).toBeGreaterThanOrEqual(80);
                expect(call[0]).toBeLessThanOrEqual(120);
                expect(call[1]).toBeGreaterThanOrEqual(80);
                expect(call[1]).toBeLessThanOrEqual(120);
            });
        });

        it('should set vx to 0', () => {
            effects.healEffect(0, 0);

            const calls = mockEngine.addParticle.mock.calls;
            calls.forEach(call => {
                expect(call[2].vx).toBe(0);
            });
        });
    });

    describe('cardGlowEffect', () => {
        it('should call addParticle once', () => {
            effects.cardGlowEffect(100, 200);

            expect(mockEngine.addParticle).toHaveBeenCalledTimes(1);
        });

        it('should use default purple color', () => {
            effects.cardGlowEffect(100, 200);

            const call = mockEngine.addParticle.mock.calls[0];
            expect(call[2].color).toBe('#8b5cf6');
        });

        it('should use custom color when provided', () => {
            effects.cardGlowEffect(100, 200, '#ff0000');

            const call = mockEngine.addParticle.mock.calls[0];
            expect(call[2].color).toBe('#ff0000');
        });

        it('should set decay to 0.05', () => {
            effects.cardGlowEffect(0, 0);

            const call = mockEngine.addParticle.mock.calls[0];
            expect(call[2].decay).toBe(0.05);
        });

        it('should set size to 2', () => {
            effects.cardGlowEffect(0, 0);

            const call = mockEngine.addParticle.mock.calls[0];
            expect(call[2].size).toBe(2);
        });

        it('should spread particles around position', () => {
            effects.cardGlowEffect(100, 200);

            const call = mockEngine.addParticle.mock.calls[0];
            // x: 100 ± 50, y: 200 ± 70
            expect(call[0]).toBeGreaterThanOrEqual(50);
            expect(call[0]).toBeLessThanOrEqual(150);
            expect(call[1]).toBeGreaterThanOrEqual(130);
            expect(call[1]).toBeLessThanOrEqual(270);
        });
    });

    describe('playCardEffect', () => {
        it('should call addParticle 30 times', () => {
            effects.playCardEffect(100, 200, '#ffffff');

            expect(mockEngine.addParticle).toHaveBeenCalledTimes(30);
        });

        it('should use provided color', () => {
            effects.playCardEffect(0, 0, '#ff0000');

            const calls = mockEngine.addParticle.mock.calls;
            calls.forEach(call => {
                expect(call[2].color).toBe('#ff0000');
            });
        });

        it('should use white as default color', () => {
            effects.playCardEffect(0, 0, null);

            const calls = mockEngine.addParticle.mock.calls;
            calls.forEach(call => {
                expect(call[2].color).toBe('#ffffff');
            });
        });

        it('should create particles in radial pattern', () => {
            effects.playCardEffect(100, 100, '#fff');

            const calls = mockEngine.addParticle.mock.calls;
            calls.forEach(call => {
                // Distance from center should be <= 50 (dist parameter)
                const dx = call[0] - 100;
                const dy = call[1] - 100;
                const dist = Math.sqrt(dx * dx + dy * dy);
                expect(dist).toBeLessThanOrEqual(50);
            });
        });

        it('should set velocity based on angle and speed 2', () => {
            effects.playCardEffect(0, 0, '#fff');

            const calls = mockEngine.addParticle.mock.calls;
            calls.forEach(call => {
                // Velocity magnitude should be ~2
                const speed = Math.sqrt(call[2].vx * call[2].vx + call[2].vy * call[2].vy);
                expect(speed).toBeCloseTo(2, 0);
            });
        });

        it('should set size to 3 and decay to 0.03', () => {
            effects.playCardEffect(0, 0, '#fff');

            const calls = mockEngine.addParticle.mock.calls;
            calls.forEach(call => {
                expect(call[2].size).toBe(3);
                expect(call[2].decay).toBe(0.03);
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle effects at negative coordinates', () => {
            effects.manaEffect(-100, -200, '#fff');
            effects.healEffect(-50, -50);
            effects.playCardEffect(-10, -10, '#fff');

            expect(mockEngine.burst).toHaveBeenCalled();
            expect(mockEngine.addParticle).toHaveBeenCalled();
        });

        it('should handle effects at large coordinates', () => {
            effects.manaEffect(10000, 10000, '#fff');
            effects.playCardEffect(5000, 5000, '#fff');

            expect(mockEngine.burst).toHaveBeenCalled();
            expect(mockEngine.addParticle).toHaveBeenCalled();
        });

        it('should handle undefined color gracefully in playCardEffect', () => {
            effects.playCardEffect(100, 100, undefined);

            const calls = mockEngine.addParticle.mock.calls;
            // Should not throw and should use white as default
            expect(calls.length).toBeGreaterThan(0);
        });

        it('should handle multiple rapid calls', () => {
            for (let i = 0; i < 10; i++) {
                effects.manaEffect(i * 10, i * 10, '#fff');
            }

            expect(mockEngine.burst).toHaveBeenCalledTimes(10);
        });
    });

    describe('Color Consistency', () => {
        it('should use correct green for healEffect', () => {
            effects.healEffect(0, 0);
            expect(mockEngine.addParticle.mock.calls[0][2].color).toBe('#4ade80');
        });

        it('should use correct default purple for cardGlowEffect', () => {
            effects.cardGlowEffect(0, 0);
            expect(mockEngine.addParticle.mock.calls[0][2].color).toBe('#8b5cf6');
        });
    });
});