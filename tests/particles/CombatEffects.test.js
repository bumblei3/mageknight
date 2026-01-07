import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatEffects } from '../../js/particles/CombatEffects.js';

describe('CombatEffects', () => {
    let effects;
    let mockEngine;

    beforeEach(() => {
        mockEngine = {
            burst: vi.fn(),
            addParticle: vi.fn()
        };
        effects = new CombatEffects(mockEngine);
    });

    describe('impactEffect', () => {
        it('should create burst with spark particles', () => {
            effects.impactEffect(100, 200);

            expect(mockEngine.burst).toHaveBeenCalledWith(
                100, 200, 15,
                expect.objectContaining({
                    type: 'spark',
                    color: '#ff4444'
                })
            );
        });

        it('should use custom color when provided', () => {
            effects.impactEffect(100, 200, '#00ff00');

            expect(mockEngine.burst).toHaveBeenCalledWith(
                100, 200, 15,
                expect.objectContaining({
                    color: '#00ff00'
                })
            );
        });
    });

    describe('combatClashEffect', () => {
        it('should add particles for physical attack', () => {
            effects.combatClashEffect(100, 200, 'physical');

            expect(mockEngine.addParticle).toHaveBeenCalledTimes(25);
        });

        it('should use fire colors for fire attack', () => {
            effects.combatClashEffect(100, 200, 'fire');

            const calls = mockEngine.addParticle.mock.calls;
            const fireColors = ['#fca5a5', '#ef4444', '#b91c1c'];

            // At least one call should use a fire color
            const hasFireColor = calls.some(call =>
                fireColors.includes(call[2].color)
            );
            expect(hasFireColor).toBe(true);
        });

        it('should use ice colors for ice attack', () => {
            effects.combatClashEffect(100, 200, 'ice');

            const calls = mockEngine.addParticle.mock.calls;
            const iceColors = ['#bae6fd', '#38bdf8', '#0284c7'];

            const hasIceColor = calls.some(call =>
                iceColors.includes(call[2].color)
            );
            expect(hasIceColor).toBe(true);
        });

        it('should default to physical colors for unknown type', () => {
            effects.combatClashEffect(100, 200, 'unknown');

            const calls = mockEngine.addParticle.mock.calls;
            const physicalColors = ['#cbd5e1', '#94a3b8', '#64748b'];

            const hasPhysicalColor = calls.some(call =>
                physicalColors.includes(call[2].color)
            );
            expect(hasPhysicalColor).toBe(true);
        });
    });

    describe('shieldBlockEffect', () => {
        it('should create ring of particles', () => {
            effects.shieldBlockEffect(100, 200);

            expect(mockEngine.addParticle).toHaveBeenCalledTimes(20);
        });

        it('should use blue shield color', () => {
            effects.shieldBlockEffect(100, 200);

            const calls = mockEngine.addParticle.mock.calls;
            calls.forEach(call => {
                expect(call[2].color).toBe('#60a5fa');
            });
        });
    });

    describe('damageSplatter', () => {
        it('should scale particle count with damage', () => {
            effects.damageSplatter(100, 200, 5);

            expect(mockEngine.burst).toHaveBeenCalledWith(
                100, 200, 10, // 5 * 2 = 10
                expect.anything()
            );
        });

        it('should cap particle count at 20', () => {
            effects.damageSplatter(100, 200, 15);

            expect(mockEngine.burst).toHaveBeenCalledWith(
                100, 200, 20, // Capped at 20
                expect.anything()
            );
        });

        it('should use red color for blood effect', () => {
            effects.damageSplatter(100, 200, 3);

            expect(mockEngine.burst).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.objectContaining({
                    color: '#ef4444'
                })
            );
        });
    });

    describe('Attack Type Effects', () => {
        it('should create fire attack effect', () => {
            effects.fireAttackEffect(100, 200);

            expect(mockEngine.burst).toHaveBeenCalledWith(
                100, 200, 20,
                expect.objectContaining({
                    color: '#ef4444'
                })
            );
        });

        it('should create ice attack effect', () => {
            effects.iceAttackEffect(100, 200);

            expect(mockEngine.burst).toHaveBeenCalledWith(
                100, 200, 20,
                expect.objectContaining({
                    color: '#38bdf8'
                })
            );
        });

        it('should create lightning attack effect with fast speed', () => {
            effects.lightningAttackEffect(100, 200);

            expect(mockEngine.burst).toHaveBeenCalledWith(
                100, 200, 15,
                expect.objectContaining({
                    color: '#fbbf24',
                    speed: 8
                })
            );
        });
    });
});
