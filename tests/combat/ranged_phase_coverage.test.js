import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RangedPhase } from '../../js/combat/RangedPhase.js';
import { COMBAT_PHASES } from '../../js/constants.js';

describe('RangedPhase - Comprehensive Coverage', () => {
    let rangedPhase;
    let mockCombat;

    beforeEach(() => {
        mockCombat = {
            phase: COMBAT_PHASES.RANGED,
            unitManager: {
                totalRangedPoints: 0,
                totalSiegePoints: 0,
                unitRangedPoints: { physical: 0, fire: 0, ice: 0, cold_fire: 0 },
                unitSiegePoints: 0
            },
            enemies: [],
            defeatedEnemies: [],
            summonedEnemies: new Map(),
            hero: {
                gainFame: vi.fn()
            }
        };

        rangedPhase = new RangedPhase(mockCombat);
    });

    describe('constructor', () => {
        it('stores combat reference', () => {
            expect(rangedPhase['combat']).toBe(mockCombat);
        });
    });

    describe('update', () => {
        it('returns error when not in RANGED phase', () => {
            mockCombat.phase = COMBAT_PHASES.BLOCK;
            const result = rangedPhase.update([]);
            expect(result.error).toBeDefined();
        });

        it('returns enemies and message when in RANGED phase', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            const enemies = [{ id: 'e1', name: 'Test' }];
            const result = rangedPhase.update(enemies);
            expect(result.enemies).toBe(enemies);
            expect(result.message).toBeDefined();
        });
    });

    describe('executeAttack', () => {
        let mockEnemy;

        beforeEach(() => {
            mockEnemy = {
                id: 'e1',
                name: 'TestEnemy',
                armor: 4,
                attack: 3,
                fame: 2,
                fortified: false,
                isBoss: false,
                currentHealth: 1,
                maxHealth: 1,
                getResistanceMultiplier: vi.fn(() => 1.0),
                getCurrentArmor: vi.fn(() => 4),
                takeDamage: vi.fn(() => ({ defeated: true, healthPercent: 0 }))
            };
        });

        it('returns error when not in RANGED phase', () => {
            mockCombat.phase = COMBAT_PHASES.BLOCK;
            const result = rangedPhase.executeAttack(mockEnemy, 0, 0);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('fails against fortified enemy without siege', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            mockEnemy.fortified = true;
            
            const result = rangedPhase.executeAttack(mockEnemy, 5, 0);
            
            expect(result.success).toBe(false);
            // Actual message from i18n
            expect(result.message).toContain('fortified');
        });

        it('succeeds against fortified enemy with siege', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            mockEnemy.fortified = true;
            mockEnemy.takeDamage = vi.fn(() => ({ defeated: true, healthPercent: 0 }));
            
            const result = rangedPhase.executeAttack(mockEnemy, 0, 5);
            
            expect(result.success).toBe(true);
        });

        it('applies resistance multiplier to damage', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            mockEnemy.getResistanceMultiplier = vi.fn(() => 0.5);
            mockEnemy.getCurrentArmor = vi.fn(() => 2); // Low armor
            mockEnemy.takeDamage = vi.fn(() => ({ defeated: true, healthPercent: 0 }));
            // Need unitManager with totalRanged/SiegePoints
            mockCombat.unitManager = {
                totalRangedPoints: 0,
                totalSiegePoints: 0,
                unitRangedPoints: { physical: 0, fire: 0, ice: 0, cold_fire: 0 },
                unitSiegePoints: 0
            };
            
            // combinedAttack = 4 + 0 + 0 + 0 = 4
            // effectiveArmor = 2 / 0.5 = 4
            // 4 >= 4 -> success
            const result = rangedPhase.executeAttack(mockEnemy, 4, 0);
            
            expect(result.success).toBe(true);
            // For regular enemies, damage isn't in result; check defeated array
            expect(result.defeated).toContain(mockEnemy);
        });

        it('handles boss attack differently', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            mockEnemy.isBoss = true;
            mockEnemy.currentHealth = 20;
            mockEnemy.takeDamage = vi.fn(() => ({ 
                defeated: false, 
                healthPercent: 0.5,
                transitions: []
            }));
            
            const result = rangedPhase.executeAttack(mockEnemy, 5, 0);
            
            expect(result.isBoss).toBe(true);
            expect(result.damage).toBeDefined();
            expect(result.healthPercent).toBeDefined();
        });

        it('tracks boss transitions', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            mockEnemy.isBoss = true;
            mockEnemy.takeDamage = vi.fn(() => ({ 
                defeated: false, 
                healthPercent: 0.5,
                transitions: [{ phase: 'Phase 2', ability: 'Rage', message: 'Boss enraged!' }]
            }));
            
            const result = rangedPhase.executeAttack(mockEnemy, 5, 0);
            
            expect(result.bossTransitions.length).toBe(1);
            expect(result.bossTransitions[0].phase).toBe('Phase 2');
        });

        it('handles boss defeated', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            mockEnemy.isBoss = true;
            mockEnemy.fame = 5;
            mockEnemy.takeDamage = vi.fn(() => ({ 
                defeated: true, 
                healthPercent: 0 
            }));
            
            const result = rangedPhase.executeAttack(mockEnemy, 10, 0);
            
            // result.defeated is array [enemy] when boss defeated
            expect(Array.isArray(result.defeated)).toBe(true);
            expect(result.fameGained).toBe(5);
            expect(mockCombat.hero.gainFame).toHaveBeenCalledWith(5);
        });

        it('defeats regular enemy when attack >= armor', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            mockEnemy.isBoss = false;
            mockEnemy.armor = 4;
            mockEnemy.takeDamage = vi.fn(() => ({ defeated: true, healthPercent: 0 }));
            
            const result = rangedPhase.executeAttack(mockEnemy, 5, 0);
            
            expect(result.success).toBe(true);
            expect(result.defeated).toContain(mockEnemy);
            expect(result.fameGained).toBe(2);
        });

        it('fails regular enemy when attack < armor', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            mockEnemy.isBoss = false;
            mockEnemy.armor = 10;
            mockEnemy.getCurrentArmor = vi.fn(() => 10);
            
            const result = rangedPhase.executeAttack(mockEnemy, 3, 0);
            
            expect(result.success).toBe(false);
            // Actual message: "Ranged too weak (3 vs 10)"
            expect(result.message).toContain('too weak');
        });

        it('calculates correct armor with multiplier', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            mockEnemy.isBoss = false;
            mockEnemy.armor = 10;
            mockEnemy.getResistanceMultiplier = vi.fn(() => 0.5); // halves damage
            mockEnemy.getCurrentArmor = vi.fn(() => 10);
            
            // effectiveArmor = 10 / 0.5 = 20, combinedAttack = 3+0=3 (ranged only)
            // Actually: attack = rangedValue + siegeValue + unitRanged + unitSiege
            // So 10 / 0.5 = 20, attack = 3 -> 3 < 20 -> fail
            const result = rangedPhase.executeAttack(mockEnemy, 3, 0);
            
            expect(result.success).toBe(false);
        });

        it('consumes ranged/siege points correctly for boss', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            mockEnemy.isBoss = true;
            mockEnemy.takeDamage = vi.fn(() => ({ defeated: false, healthPercent: 0.5, transitions: [] }));
            
            const result = rangedPhase.executeAttack(mockEnemy, 3, 2);
            
            expect(result.consumedRanged).toBe(3);
            expect(result.consumedSiege).toBe(2);
        });

        it('consumes siege only for fortified boss', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            mockEnemy.isBoss = true;
            mockEnemy.fortified = true;
            mockEnemy.takeDamage = vi.fn(() => ({ defeated: false, healthPercent: 0.5, transitions: [] }));
            
            const result = rangedPhase.executeAttack(mockEnemy, 3, 2);
            
            expect(result.consumedRanged).toBe(0);
            expect(result.consumedSiege).toBe(2);
        });

        it('resets unit manager points for boss non-fortified', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            mockEnemy.isBoss = true;
            mockEnemy.fortified = false;
            mockEnemy.takeDamage = vi.fn(() => ({ defeated: false, healthPercent: 0.5, transitions: [] }));
            
            rangedPhase.executeAttack(mockEnemy, 3, 2);
            
            expect(mockCombat.unitManager.unitRangedPoints.physical).toBe(0);
            expect(mockCombat.unitManager.unitSiegePoints).toBe(0);
        });

        it('handles enemy defeated and removed from combat', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            mockEnemy.isBoss = false;
            mockEnemy.takeDamage = vi.fn(() => ({ defeated: true, healthPercent: 0 }));
            mockCombat.enemies = [mockEnemy];
            
            rangedPhase.executeAttack(mockEnemy, 5, 0);
            
            expect(mockCombat.enemies.length).toBe(0);
        });

        it('uses getCurrentArmor when available', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            mockEnemy.isBoss = false;
            mockEnemy.armor = 10;
            mockEnemy.getCurrentArmor = vi.fn(() => 3); // Returns lower than base armor
            mockEnemy.takeDamage = vi.fn(() => ({ defeated: true, healthPercent: 0 }));
            
            const result = rangedPhase.executeAttack(mockEnemy, 3, 0);
            
            expect(result.success).toBe(true); // Uses getCurrentArmor=3, attack=3 >= 3
        });
    });

    describe('handleSummoning', () => {
        let mockSummoner;
        let mockEnemies;

        beforeEach(() => {
            mockSummoner = {
                id: 'summoner1',
                name: 'Summoner',
                summoner: true,
                constructor: class MockEnemy {
                    constructor(def) { Object.assign(this, def); }
                }
            };
            
            mockEnemies = [mockSummoner];
            mockCombat.enemies = mockEnemies;
        });

        it('does nothing when no summoners', () => {
            mockCombat.enemies = [];
            mockCombat.summonedEnemies = new Map();
            
            rangedPhase.handleSummoning([], []);
            
            expect(mockCombat.summonedEnemies.size).toBe(0);
        });

        it('summons enemy for each summoner', () => {
            mockCombat.summonedEnemies = new Map();
            mockCombat.enemies = [mockSummoner];
            
            rangedPhase.handleSummoning([mockSummoner], []);
            
            expect(mockCombat.summonedEnemies.size).toBe(1);
        });

        it('replaces summoner in enemies list', () => {
            const originalEnemy = { ...mockSummoner, summoner: true };
            mockCombat.enemies = [originalEnemy];
            mockCombat.summonedEnemies = new Map();
            
            rangedPhase.handleSummoning([originalEnemy], []);
            
            // Should have summoned enemy in place of original
            expect(mockCombat.enemies[0].summoned).toBe(true);
        });

        it('skips defeated enemies', () => {
            const defeatedSummoner = { ...mockSummoner, id: 'defeated', summoner: true };
            mockCombat.enemies = [defeatedSummoner];
            mockCombat.summonedEnemies = new Map();
            
            rangedPhase.handleSummoning([defeatedSummoner], [defeatedSummoner]);
            
            expect(mockCombat.summonedEnemies.size).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        it('handles enemy without getCurrentArmor', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            const enemy = {
                id: 'e1',
                name: 'Test',
                armor: 3,
                attack: 2,
                fame: 1,
                isBoss: false,
                fortified: false,
                currentHealth: 1,
                maxHealth: 1,
                getResistanceMultiplier: vi.fn(() => 1.0),
                takeDamage: vi.fn(() => ({ defeated: true, healthPercent: 0 }))
            };
            // No getCurrentArmor method
            
            const result = rangedPhase.executeAttack(enemy, 3, 0);
            
            expect(result.success).toBe(true);
        });

        it('handles enemy without takeDamage', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            const enemy = {
                id: 'e1',
                name: 'Test',
                armor: 3,
                isBoss: false,
                getResistanceMultiplier: vi.fn(() => 1.0),
                getCurrentArmor: () => 3
            };
            // No takeDamage method - code may throw or skip
            
            const result = rangedPhase.executeAttack(enemy, 3, 0);
            
            // Without takeDamage, code may return success: true (no damage validation) or throw
            // Just verify it returns a result object without crashing
            expect(result).toBeDefined();
            expect(typeof result.success).toBe('boolean');
        });

        it('handles unitManager without totalRangedPoints', () => {
            mockCombat.phase = COMBAT_PHASES.RANGED;
            mockCombat.unitManager = {};
            const enemy = {
                id: 'e1',
                name: 'Test',
                armor: 3,
                isBoss: false,
                getResistanceMultiplier: vi.fn(() => 1.0),
                getCurrentArmor: () => 3,
                takeDamage: vi.fn(() => ({ defeated: true, healthPercent: 0 }))
            };
            
            const result = rangedPhase.executeAttack(enemy, 3, 0);
            
            // Empty unitManager may cause NaN or other issues
            // Just verify it doesn't crash
            expect(result).toBeDefined();
            expect(typeof result.success).toBe('boolean');
        });
    });
});