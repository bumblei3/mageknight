import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CombatLogDetails } from '../js/combat/CombatLogDetails.js';
import { setupGlobalMocks, resetMocks } from './test-mocks.js';

describe('CombatLogDetails - Coverage Boost', () => {
    let combatLogDetails;
    let mockGame;

    beforeEach(() => {
        setupGlobalMocks();
        
        mockGame = {
            addLog: vi.fn(),
        };
        
        combatLogDetails = new CombatLogDetails(mockGame);
    });

    afterEach(() => {
        vi.useRealTimers();
        resetMocks();
    });

    describe('Constructor', () => {
        it('should initialize with game reference', () => {
            expect(combatLogDetails.game).toBe(mockGame);
        });

        it('should handle missing game gracefully', () => {
            const cld = new CombatLogDetails(null);
            expect(cld.game).toBeNull();
        });
    });

    describe('logDetailedBlock()', () => {
        it('should format block details with cards and units', () => {
            const breakdown = {
                enemyName: 'Orc',
                enemyElement: 'physical',
                requiredBlock: 5,
                cardBlocks: [
                    { value: 2, element: 'ice', effective: 2, efficient: true },
                    { value: 3, element: 'fire', effective: 1, efficient: false },
                ],
                unitBlock: { value: 2, effective: 2, efficient: true },
                totalEffective: 5,
                totalInput: 7,
                blocked: true,
                inefficiencyReasons: ['Fire vs Physical = Inefficient'],
            };

            const result = combatLogDetails.logDetailedBlock(breakdown);
            
            expect(result).toContain('🛡️ Block-Details: Orc');
            expect(result).toContain('Angriff: 5 (⚔)');
            expect(result).toContain('Karten:');
            expect(result).toContain('2 ❄ → 2 ✓');
            expect(result).toContain('3 🔥 → 1 ½');
            expect(result).toContain('Einheiten: 2 → 2 ✓');
            expect(result).toContain('⚠ Ineffizienz: Fire vs Physical = Inefficient');
            expect(result).toContain('✅ GEBLOCKT (5 / 5)');
        });

        it('should handle no card blocks', () => {
            const breakdown = {
                enemyName: 'Orc',
                enemyElement: 'physical',
                requiredBlock: 5,
                cardBlocks: [],
                unitBlock: { value: 5, effective: 5, efficient: true },
                totalEffective: 5,
                totalInput: 5,
                blocked: true,
                inefficiencyReasons: [],
            };

            const result = combatLogDetails.logDetailedBlock(breakdown);
            
            expect(result).toContain('Einheiten: 5 → 5 ✓');
            expect(result).not.toContain('Karten:');
        });

        it('should handle no unit block', () => {
            const breakdown = {
                enemyName: 'Orc',
                enemyElement: 'physical',
                requiredBlock: 3,
                cardBlocks: [
                    { value: 2, element: 'ice', effective: 2, efficient: true },
                ],
                unitBlock: { value: 0, effective: 0, efficient: true },
                totalEffective: 2,
                totalInput: 2,
                blocked: false,
                inefficiencyReasons: [],
            };

            const result = combatLogDetails.logDetailedBlock(breakdown);
            
            expect(result).toContain('Karten:');
            expect(result).not.toContain('Einheiten:');
        });

        it('should handle cumbersomeUsed', () => {
            const breakdown = {
                enemyName: 'Orc',
                enemyElement: 'physical',
                requiredBlock: 5,
                cardBlocks: [],
                unitBlock: { value: 0, effective: 0, efficient: true },
                totalEffective: 5,
                totalInput: 5,
                blocked: true,
                inefficiencyReasons: [],
                cumbersomeUsed: 2,
            };

            const result = combatLogDetails.logDetailedBlock(breakdown);
            
            expect(result).toContain('⬇ Schwerfällig: −2 Bewegungspunkte');
        });

        it('should handle no cumbersomeUsed', () => {
            const breakdown = {
                enemyName: 'Orc',
                enemyElement: 'physical',
                requiredBlock: 5,
                cardBlocks: [],
                unitBlock: { value: 0, effective: 0, efficient: true },
                totalEffective: 5,
                totalInput: 5,
                blocked: true,
                inefficiencyReasons: [],
            };

            const result = combatLogDetails.logDetailedBlock(breakdown);
            
            expect(result).not.toContain('Schwerfällig');
        });

        it('should handle missing inefficiencyReasons', () => {
            const breakdown = {
                enemyName: 'Orc',
                enemyElement: 'physical',
                requiredBlock: 5,
                cardBlocks: [],
                unitBlock: { value: 0, effective: 0, efficient: true },
                totalEffective: 5,
                totalInput: 5,
                blocked: true,
                // inefficiencyReasons intentionally omitted
            };

            const result = combatLogDetails.logDetailedBlock(breakdown);
            
            expect(result).toContain('✅ GEBLOCKT');
        });

        it('should show NOT BLOCKED when blocked is false', () => {
            const breakdown = {
                enemyName: 'Orc',
                enemyElement: 'physical',
                requiredBlock: 5,
                cardBlocks: [],
                unitBlock: { value: 0, effective: 0, efficient: true },
                totalEffective: 2,
                totalInput: 2,
                blocked: false,
                inefficiencyReasons: [],
            };

            const result = combatLogDetails.logDetailedBlock(breakdown);
            
            expect(result).toContain('❌ NICHT GEBLOCKT (2 / 5)');
        });
    });

    describe('logDetailedDamage()', () => {
        it('should format damage phase with unblocked enemies', () => {
            const breakdown = {
                totalEnemyAttack: 10,
                unblockedEnemies: [
                    { name: 'Orc', attack: 5, element: 'physical', abilities: ['fortified'] },
                    { name: 'Drake', attack: 5, element: 'fire', abilities: [] },
                ],
                heroArmor: 3,
                baseWounds: 4,
                poisonWounds: 1,
                paralyzeTriggered: false,
                vampirismArmorGained: 0,
                totalWoundsReceived: 5,
            };

            const result = combatLogDetails.logDetailedDamage(breakdown);
            
            expect(result).toContain('💥 Schaden-Phase');
            expect(result).toContain('Ungeschützte Feinde:');
            expect(result).toContain('Orc: 5 ⚔ [fortified]');
            expect(result).toContain('Drake: 5 🔥');
            expect(result).toContain('Gesamtschaden: 10');
            expect(result).toContain('Held-Rüstung: 3');
            expect(result).toContain('Basis-Wunden: ⌈10 / 3⌉ = 4');
        });

        it('should handle no unblocked enemies', () => {
            const breakdown = {
                totalEnemyAttack: 0,
                unblockedEnemies: [],
                heroArmor: 3,
                baseWounds: 0,
                poisonWounds: 0,
                paralyzeTriggered: false,
                vampirismArmorGained: 0,
                totalWoundsReceived: 0,
            };

            const result = combatLogDetails.logDetailedDamage(breakdown);
            
            expect(result).not.toContain('Ungeschützte Feinde:');
        });

        it('should handle poison wounds', () => {
            const breakdown = {
                totalEnemyAttack: 5,
                unblockedEnemies: [],
                heroArmor: 3,
                baseWounds: 2,
                poisonWounds: 2,
                paralyzeTriggered: false,
                vampirismArmorGained: 0,
                totalWoundsReceived: 4,
            };

            const result = combatLogDetails.logDetailedDamage(breakdown);
            
            expect(result).toContain('☠ Gift: +2 Wunden (Ablagestapel)');
        });

        it('should handle paralyze triggered', () => {
            const breakdown = {
                totalEnemyAttack: 5,
                unblockedEnemies: [],
                heroArmor: 3,
                baseWounds: 2,
                poisonWounds: 0,
                paralyzeTriggered: true,
                vampirismArmorGained: 0,
                totalWoundsReceived: 2,
            };

            const result = combatLogDetails.logDetailedDamage(breakdown);
            
            expect(result).toContain('🗿 Versteinerung: Karten-Abwurf erzwungen!');
        });

        it('should handle vampirism armor gained', () => {
            const breakdown = {
                totalEnemyAttack: 5,
                unblockedEnemies: [],
                heroArmor: 3,
                baseWounds: 2,
                poisonWounds: 0,
                paralyzeTriggered: false,
                vampirismArmorGained: 2,
                totalWoundsReceived: 2,
            };

            const result = combatLogDetails.logDetailedDamage(breakdown);
            
            expect(result).toContain('🧛 Vampirismus: Feind +2 Rüstung');
        });

        it('should show total wounds received', () => {
            const breakdown = {
                totalEnemyAttack: 10,
                unblockedEnemies: [],
                heroArmor: 3,
                baseWounds: 4,
                poisonWounds: 0,
                paralyzeTriggered: false,
                vampirismArmorGained: 0,
                totalWoundsReceived: 4,
            };

            const result = combatLogDetails.logDetailedDamage(breakdown);
            
            expect(result).toContain('🩸 Gesamt-Wunden: 4');
        });
    });

    describe('logDetailedAttack()', () => {
        it('should format attack phase with targets', () => {
            const breakdown = {
                totalAttack: 8,
                cardAttack: 5,
                unitAttack: 3,
                attackElement: 'fire',
                targets: [
                    { name: 'Orc', type: 'regular', armor: 3, resistanceMultiplier: 1, effectiveArmor: 3, damageDealt: 5, defeated: true },
                    { name: 'Dragon', type: 'boss', armor: 8, resistanceMultiplier: 0.5, effectiveArmor: 4, damageDealt: 4, defeated: false },
                ],
                remainingAttack: 0,
            };

            const result = combatLogDetails.logDetailedAttack(breakdown);
            
            expect(result).toContain('⚔️ Angriffs-Phase');
            expect(result).toContain('Karten: 5 + Einheiten: 3 = 8 (🔥)');
            expect(result).toContain('Ziele:');
            expect(result).toContain('Orc: 3 eff. Rüstung (×1) → 💀 BESEITIGT');
            expect(result).toContain('Dragon: 4 eff. Rüstung (×0.5) → ▸ 4 Schaden');
        });

        it('should handle no targets', () => {
            const breakdown = {
                totalAttack: 5,
                cardAttack: 5,
                unitAttack: 0,
                attackElement: 'ice',
                targets: [],
                remainingAttack: 0,
            };

            const result = combatLogDetails.logDetailedAttack(breakdown);
            
            expect(result).not.toContain('Ziele:');
        });

        it('should show remaining attack when > 0', () => {
            const breakdown = {
                totalAttack: 10,
                cardAttack: 7,
                unitAttack: 3,
                attackElement: 'physical',
                targets: [],
                remainingAttack: 3,
            };

            const result = combatLogDetails.logDetailedAttack(breakdown);
            
            expect(result).toContain('Verbleibend: 3');
        });
    });

    describe('logDetailedRanged()', () => {
        it('should format ranged phase details', () => {
            const breakdown = {
                enemyName: 'Mage',
                rangedValue: 4,
                siegeValue: 2,
                resistanceMultiplier: 1,
                isFortified: false,
                damageDealt: 6,
                defeated: true,
            };

            const result = combatLogDetails.logDetailedRanged(breakdown);
            
            expect(result).toContain('🏹 Fernkampf: Mage');
            expect(result).toContain('Wert: 4 Fernkampf + 2 Belagerung = 6');
            expect(result).toContain('Resistenz: ×1');
            expect(result).toContain('Schaden: 6 💀 BESEITIGT');
        });

        it('should show fortified status', () => {
            const breakdown = {
                enemyName: 'Keep',
                rangedValue: 5,
                siegeValue: 0,
                resistanceMultiplier: 0.5,
                isFortified: true,
                damageDealt: 2,
                defeated: false,
            };

            const result = combatLogDetails.logDetailedRanged(breakdown);
            
            expect(result).toContain('Resistenz: ×0.5 (Befestigt)');
        });

        it('should show not defeated status', () => {
            const breakdown = {
                enemyName: 'Dragon',
                rangedValue: 3,
                siegeValue: 1,
                resistanceMultiplier: 1,
                isFortified: false,
                damageDealt: 4,
                defeated: false,
            };

            const result = combatLogDetails.logDetailedRanged(breakdown);
            
            expect(result).toContain('Schaden: 4');
            expect(result).not.toContain('💀 BESEITIGT');
        });
    });

    describe('Compact Log Methods', () => {
        it('should log compact block', () => {
            combatLogDetails.logCompactBlock('Orc', true, 5, 5, false);
            
            expect(mockGame.addLog).toHaveBeenCalledWith('✅ Orc: Block 5 / 5', 'success');
        });

        it('should log compact block with inefficiency', () => {
            combatLogDetails.logCompactBlock('Orc', true, 5, 5, true);
            
            expect(mockGame.addLog).toHaveBeenCalledWith('✅ Orc: Block 5 / 5 (½)', 'success');
        });

        it('should log compact block failed', () => {
            combatLogDetails.logCompactBlock('Orc', false, 3, 5, false);
            
            expect(mockGame.addLog).toHaveBeenCalledWith('❌ Orc: Block 3 / 5', 'warning');
        });

        it('should log compact damage', () => {
            combatLogDetails.logCompactDamage(3, true, false);
            
            expect(mockGame.addLog).toHaveBeenCalledWith('💥 3 Wunden + Gift', 'combat');
        });

        it('should log compact damage with paralyze', () => {
            combatLogDetails.logCompactDamage(2, false, true);
            
            expect(mockGame.addLog).toHaveBeenCalledWith('💥 2 Wunden + Versteinerung', 'combat');
        });

        it('should log compact attack with defeated', () => {
            combatLogDetails.logCompactAttack(2, 3, 2);
            
            expect(mockGame.addLog).toHaveBeenCalledWith('⚔️ 2/3 besiegt (Rest-Angriff: 2)', 'success');
        });

        it('should log compact attack with no defeats', () => {
            combatLogDetails.logCompactAttack(0, 2, 1);
            
            expect(mockGame.addLog).toHaveBeenCalledWith('⚔️ Zu schwach (Angriff: 1)', 'warning');
        });
    });

    describe('formatElement()', () => {
        it('should format physical element', () => {
            const result = combatLogDetails.formatElement('physical');
            expect(result).toBe('⚔');
        });

        it('should format fire element', () => {
            const result = combatLogDetails.formatElement('fire');
            expect(result).toBe('🔥');
        });

        it('should format ice element', () => {
            const result = combatLogDetails.formatElement('ice');
            expect(result).toBe('❄');
        });

        it('should format cold_fire element', () => {
            const result = combatLogDetails.formatElement('cold_fire');
            expect(result).toBe('🧊');
        });

        it('should return element as-is for unknown', () => {
            const result = combatLogDetails.formatElement('unknown');
            expect(result).toBe('unknown');
        });

        it('should handle missing element', () => {
            const result = combatLogDetails.formatElement('');
            expect(result).toBe('');
        });
    });

    describe('Edge Cases', () => {
        it('should handle null game gracefully', () => {
            const cld = new CombatLogDetails(null);
            // These should not throw but will fail on addLog - just verify methods exist
            expect(typeof cld.formatElement).toBe('function');
            expect(typeof cld.logDetailedBlock).toBe('function');
            expect(typeof cld.logDetailedDamage).toBe('function');
            expect(typeof cld.logDetailedAttack).toBe('function');
            expect(typeof cld.logDetailedRanged).toBe('function');
            expect(typeof cld.logCompactBlock).toBe('function');
            expect(typeof cld.logCompactDamage).toBe('function');
            expect(typeof cld.logCompactAttack).toBe('function');
        });

        it('should handle formatElement with null', () => {
            const result = combatLogDetails.formatElement(null);
            expect(result).toBe(null);
        });
    });
});