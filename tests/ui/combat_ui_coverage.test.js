import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSpy, createMockUI, setupGlobalMocks } from '../test-mocks.js';
import { CombatUIManager } from '../../js/ui/CombatUIManager.js';
import { TooltipManager } from '../../js/ui/TooltipManager.js';
import { COMBAT_PHASES, ACTION_TYPES } from '../../js/constants.js';

// Mock Unit class
class MockUnit {
    constructor(data = {}) {
        this.id = data.id || 'test-unit';
        this.name = data.name || 'Test Unit';
        this.icon = data.icon || '🧪';
        this.abilities = data.abilities || [];
        this.ready = data.ready !== false;
        this.elementBlocks = data.elementBlocks || {};
        this.getAbilities = data.getAbilities || (() => this.abilities);
    }

    getName() { return this.name; }
    getIcon() { return this.icon; }
    isReady() { return this.ready; }
}

// Mock Enemy class
class MockEnemy {
    constructor(data = {}) {
        this.id = data.id || 'test-enemy';
        this.name = data.name || 'Test Enemy';
        this.armor = data.armor || 3;
        this.attack = data.attack || 4;
        this.fame = data.fame || 2;
        this.assassin = data.assassin || false;
        this.damageAssigned = data.damageAssigned || false;
        this.attackType = data.attackType || 'physical';
        this.abilities = data.abilities || [];
        this.vampiric = data.vampiric || false;
        this.poison = data.poison || false;
        this.fortified = data.fortified || false;
        this.swift = data.swift || false;
        this.brutal = data.brutal || false;
        this.paralyze = data.paralyze || false;
        this.cumbersome = data.cumbersome || false;
        this.summoner = data.summoner || false;
        this.elusive = data.elusive || false;
        this.isBoss = data.isBoss || false;
        this.color = data.color || '#fff';
        this.icon = data.icon || '👹';
        this.currentHealth = data.currentHealth || this.armor;
        this.maxHealth = data.maxHealth || this.armor;
        this.enraged = data.enraged || false;
    }

    getEffectiveAttack() { return this.attack; }
    getBlockRequirement() { return this.armor; }
    getCurrentArmor() { return this.armor; }
    getResistanceMultiplier() { return 1; }
    getHealthPercent() { return this.currentHealth / this.maxHealth; }
    getPhaseName() { return 'Boss'; }
}

describe('CombatUIManager - Coverage Boost', () => {
    let combatUIManager;
    let mockUI;
    let container;
    let totalsDiv;
    let predictionDiv;
    let combatInfoDiv;

    beforeEach(() => {
        setupGlobalMocks();
        
        document.body.innerHTML = `
            <div id="combat-info"></div>
            <div id="combat-units"></div>
            <div id="combat-totals"></div>
            <div id="combat-prediction"></div>
            <div id="combat-phase"></div>
            <div id="execute-attack-btn"></div>
        `;

        mockUI = createMockUI();
        mockUI.game = {
            combat: {
                blockedEnemies: new Set(),
                unblockedEnemies: [],
                getPredictedOutcome: () => null,
                phase: COMBAT_PHASES.RANGED,
                enemies: []
            },
            hero: {
                armor: 2,
                getResistances: () => ({})
            }
        };
        mockUI.elements = {
            combatInfo: document.getElementById('combat-info'),
            combatUnits: document.getElementById('combat-units'),
            combatTotals: document.getElementById('combat-totals'),
            combatPrediction: document.getElementById('combat-prediction'),
            combatPhase: document.getElementById('combat-phase'),
            executeAttackBtn: document.getElementById('execute-attack-btn'),
            playedCards: { getBoundingClientRect: () => ({ top: 0, left: 0, right: 100, bottom: 100 }) },
            handCards: { getBoundingClientRect: () => ({ top: 0, left: 0, right: 100, bottom: 100 }) }
        };

        combatUIManager = new CombatUIManager(mockUI.elements, mockUI);
        
        container = document.getElementById('combat-units');
        totalsDiv = document.getElementById('combat-totals');
        predictionDiv = document.getElementById('combat-prediction');
        combatInfoDiv = document.getElementById('combat-info');
    });

    describe('renderUnitsInCombat - All Phases', () => {
        const createUnitWithBlock = (element = 'physical', value = 3, text = `${value} ${element} Block`) => {
            return new MockUnit({
                id: 'unit-1',
                name: 'Block Unit',
                abilities: [{ type: ACTION_TYPES.BLOCK, value, element, text }]
            });
        };

        const createUnitWithAttack = (element = 'physical', value = 4, text = `${value} ${element} Attack`) => {
            return new MockUnit({
                id: 'unit-2',
                name: 'Attack Unit',
                abilities: [{ type: ACTION_TYPES.ATTACK, value, element, text }]
            });
        };

        const createUnitWithRanged = (element = 'physical', value = 2, type = ACTION_TYPES.RANGED, text = `${value} ${element} Ranged`) => {
            return new MockUnit({
                id: 'unit-3',
                name: 'Ranged Unit',
                abilities: [{ type, value, element, text }]
            });
        };

        it('should render units in BLOCK phase with block abilities', () => {
            const unit = createUnitWithBlock('ice', 3, '3 Eis-Block');
            combatUIManager.renderUnitsInCombat([unit], COMBAT_PHASES.BLOCK, () => {});

            const unitCard = container.querySelector('.unit-combat-card');
            
            expect(unitCard).toBeTruthy();
            expect(unitCard.innerHTML).toContain('Block Unit');
            expect(unitCard.innerHTML).toContain('❄️');
            expect(unitCard.innerHTML).toContain('3 Eis-Block');
            expect(unitCard.classList.contains('not-ready')).toBe(false);
        });

        it('should render units in ATTACK phase with attack abilities', () => {
            const unit = createUnitWithAttack('fire', 4, '4 Feuer-Angriff');
            combatUIManager.renderUnitsInCombat([unit], COMBAT_PHASES.ATTACK, () => {});

            const unitCard = container.querySelector('.unit-combat-card');
            
            expect(unitCard).toBeTruthy();
            expect(unitCard.innerHTML).toContain('Attack Unit');
            expect(unitCard.innerHTML).toContain('🔥');
            expect(unitCard.innerHTML).toContain('4 Feuer-Angriff');
        });

        it('should render units in RANGED phase with ranged abilities', () => {
            const unit = createUnitWithRanged('physical', 2, ACTION_TYPES.RANGED, '2 Physical Fernkampf');
            combatUIManager.renderUnitsInCombat([unit], COMBAT_PHASES.RANGED, () => {});

            const unitCard = container.querySelector('.unit-combat-card');
            
            expect(unitCard).toBeTruthy();
            expect(unitCard.innerHTML).toContain('Ranged Unit');
            expect(unitCard.innerHTML).toContain('⚔️');
            expect(unitCard.innerHTML).toContain('2 Physical Fernkampf');
        });

        it('should render units in RANGED phase with siege abilities', () => {
            const unit = createUnitWithRanged('physical', 3, ACTION_TYPES.SIEGE, '3 Physical Belagerung');
            combatUIManager.renderUnitsInCombat([unit], COMBAT_PHASES.RANGED, () => {});

            const unitCard = container.querySelector('.unit-combat-card');
            
            expect(unitCard).toBeTruthy();
            expect(unitCard.innerHTML).toContain('3 Physical Belagerung');
        });

        it('should render units in DAMAGE phase WITHOUT Assassin restriction', () => {
            mockUI.game.combat.unblockedEnemies = [
                new MockEnemy({ id: 'e1', name: 'Orc', assassin: false })
            ];
            
            const unit = new MockUnit({ id: 'unit-1', name: 'Damage Unit', ready: true });
            combatUIManager.renderUnitsInCombat([unit], COMBAT_PHASES.DAMAGE, () => {});

            const unitCard = container.querySelector('.unit-combat-card');
            
            expect(unitCard).toBeTruthy();
            expect(unitCard.classList.contains('damage-target')).toBe(true);
            expect(unitCard.innerHTML).toContain('Schaden nehmen (-1 Wunde)');
        });

        it('should DISABLE units in DAMAGE phase WITH Assassin restriction', () => {
            mockUI.game.combat.unblockedEnemies = [
                new MockEnemy({ id: 'e1', name: 'Assassin', assassin: true, damageAssigned: false })
            ];
            
            const unit = new MockUnit({ id: 'unit-1', name: 'Damage Unit', ready: true });
            combatUIManager.renderUnitsInCombat([unit], COMBAT_PHASES.DAMAGE, () => {});

            const unitCard = container.querySelector('.unit-combat-card');
            
            expect(unitCard).toBeTruthy();
            expect(unitCard.classList.contains('not-ready')).toBe(true);
            expect(unitCard.classList.contains('damage-target')).toBe(false);
            expect(unitCard.innerHTML).toContain('🗡️ Attentäter! Schaden muss vom Helden genommen werden');
        });

        it('should attach Assassin restriction tooltip to disabled units in DAMAGE phase', () => {
            mockUI.game.combat.unblockedEnemies = [
                new MockEnemy({ id: 'e1', name: 'Assassin', assassin: true, damageAssigned: false })
            ];
            
            const unit = new MockUnit({ id: 'unit-1', name: 'Damage Unit', ready: true });
            combatUIManager.renderUnitsInCombat([unit], COMBAT_PHASES.DAMAGE, () => {});

            const unitCard = container.querySelector('.unit-combat-card');
            
            expect(unitCard).toBeTruthy();
            // Verify tooltipManager.attachToElement was called with the unit card and tooltip content
            expect(mockUI.tooltipManager.attachToElement.called).toBe(true);
            const attachCall = mockUI.tooltipManager.attachToElement.calls.find(call => call[0] === unitCard);
            expect(attachCall).toBeTruthy();
            // Verify tooltip content contains Assassin explanation
            const tooltipHTML = attachCall[1];
            expect(tooltipHTML).toContain('Attentäter-Effekt');
            expect(tooltipHTML).toContain('kann nicht');
            expect(tooltipHTML).toContain('Helden genommen werden');
        });

        it('should show hint for Damage Phase when Assassin restriction active', () => {
            mockUI.game.combat.unblockedEnemies = [
                new MockEnemy({ id: 'e1', name: 'Assassin', assassin: true, damageAssigned: false })
            ];
            
            const unit = new MockUnit({ id: 'unit-1', name: 'Damage Unit' });
            combatUIManager.renderUnitsInCombat([unit], COMBAT_PHASES.DAMAGE, () => {});

            const hint = container.querySelector('.damage-assignment-hint');
            
            expect(hint).toBeTruthy();
            expect(hint.textContent).toContain('Attentäter im Kampf');
            expect(hint.textContent).toContain('kann NICHT auf Einheiten zugewiesen werden');
            expect(hint.style.fontWeight).toBe('bold');
        });

        it('should show normal hint for Damage Phase without Assassin', () => {
            mockUI.game.combat.unblockedEnemies = [
                new MockEnemy({ id: 'e1', name: 'Orc', assassin: false })
            ];
            
            const unit = new MockUnit({ id: 'unit-1', name: 'Damage Unit' });
            combatUIManager.renderUnitsInCombat([unit], COMBAT_PHASES.DAMAGE, () => {});

            const hint = container.querySelector('.damage-assignment-hint');
            
            expect(hint).toBeTruthy();
            expect(hint.textContent).toContain('Klicke auf eine Einheit, um Schaden zuzuweisen');
        });

        it('should not crash with no units', () => {
            expect(() => {
                combatUIManager.renderUnitsInCombat([], COMBAT_PHASES.BLOCK, () => {});
            }).not.toThrow();
        });

        it('should not crash with null container', () => {
            mockUI.elements.combatUnits = null;
            expect(() => {
                combatUIManager.renderUnitsInCombat([new MockUnit()], COMBAT_PHASES.BLOCK, () => {});
            }).not.toThrow();
        });
    });

    describe('getElementIcon', () => {
        it('should return fire icon for fire element', () => {
            expect(combatUIManager.getElementIcon('fire')).toBe('🔥');
        });

        it('should return ice icon for ice element', () => {
            expect(combatUIManager.getElementIcon('ice')).toBe('❄️');
        });

        it('should return cold_fire icon for cold_fire element', () => {
            expect(combatUIManager.getElementIcon('cold_fire')).toBe('🔥❄️');
        });

        it('should return physical icon for physical element', () => {
            expect(combatUIManager.getElementIcon('physical')).toBe('⚔️');
        });

        it('should return holy icon for holy element', () => {
            expect(combatUIManager.getElementIcon('holy')).toBe('✨');
        });

        it('should return physical icon for unknown element', () => {
            expect(combatUIManager.getElementIcon('unknown')).toBe('⚔️');
        });

        it('should return physical icon for undefined element', () => {
            expect(combatUIManager.getElementIcon(undefined)).toBe('⚔️');
        });
    });

    describe('updateCombatTotals - Prediction Display', () => {
        const setupPredictionMock = (prediction) => {
            mockUI.game.combat.getPredictedOutcome = () => prediction;
        };

        it('should render prediction with elemental efficiency warnings in totalsDiv', () => {
            const prediction = {
                expectedWounds: 2,
                poisonWounds: 0,
                isPoisoned: false,
                enemiesDefeated: ['Orc'],
                totalEnemyAttack: 6,
                elementalEfficiencyWarnings: ['Feuer-Angriff gegen Drache nur 50% wirksam (Resistenz)'],
                blockEfficiencyWarnings: ['Eis-Block gegen Feuer-Angriff nur 50% wirksam'],
                assassinRestriction: false
            };
            setupPredictionMock(prediction);

            combatUIManager.updateCombatTotals(5, 3, COMBAT_PHASES.RANGED);

            expect(totalsDiv.innerHTML).toContain('efficiency-warning');
            expect(totalsDiv.innerHTML).toContain('Feuer-Angriff gegen Drache');
            expect(totalsDiv.innerHTML).toContain('Eis-Block gegen Feuer-Angriff');
        });

        it('should render prediction with Assassin warning in totalsDiv', () => {
            const prediction = {
                expectedWounds: 3,
                poisonWounds: 0,
                isPoisoned: false,
                enemiesDefeated: [],
                totalEnemyAttack: 8,
                elementalEfficiencyWarnings: [],
                blockEfficiencyWarnings: [],
                assassinRestriction: true
            };
            setupPredictionMock(prediction);

            combatUIManager.updateCombatTotals(4, 2, COMBAT_PHASES.ATTACK);

            expect(totalsDiv.innerHTML).toContain('prediction-warning');
            // DE Attentäter / EN Assassin
            expect(totalsDiv.innerHTML).toMatch(/Attentäter|Assassin/i);
        });

        it('should render prediction with poison warning in totalsDiv', () => {
            const prediction = {
                expectedWounds: 2,
                poisonWounds: 4,
                isPoisoned: true,
                enemiesDefeated: [],
                totalEnemyAttack: 5,
                elementalEfficiencyWarnings: [],
                blockEfficiencyWarnings: [],
                assassinRestriction: false
            };
            setupPredictionMock(prediction);

            combatUIManager.updateCombatTotals(4, 2, COMBAT_PHASES.ATTACK);

            expect(totalsDiv.innerHTML).toContain('poison-warning');
            // DE GIFT / EN POISON
            expect(totalsDiv.innerHTML).toMatch(/GIFT|POISON/i);
        });

        it('should render safe prediction when no wounds expected', () => {
            const prediction = {
                expectedWounds: 0,
                poisonWounds: 0,
                isPoisoned: false,
                enemiesDefeated: ['Goblin'],
                totalEnemyAttack: 1,
                elementalEfficiencyWarnings: [],
                blockEfficiencyWarnings: [],
                assassinRestriction: false
            };
            setupPredictionMock(prediction);

            combatUIManager.updateCombatTotals(5, 5, COMBAT_PHASES.ATTACK);

            expect(totalsDiv.innerHTML).toContain('prediction-safe');
            // DE / EN
            expect(totalsDiv.innerHTML).toMatch(/Kein Schaden erwartet|No damage expected/i);
        });

        it('should render defeated enemies list', () => {
            const prediction = {
                expectedWounds: 1,
                poisonWounds: 0,
                isPoisoned: false,
                enemiesDefeated: ['Orc', 'Goblin'],
                totalEnemyAttack: 4,
                elementalEfficiencyWarnings: [],
                blockEfficiencyWarnings: [],
                assassinRestriction: false
            };
            setupPredictionMock(prediction);

            combatUIManager.updateCombatTotals(6, 4, COMBAT_PHASES.ATTACK);

            expect(totalsDiv.innerHTML).toContain('prediction-success');
            expect(totalsDiv.innerHTML).toContain('Orc');
            expect(totalsDiv.innerHTML).toContain('Goblin');
        });

        it('should render block totals in BLOCK phase', () => {
            combatUIManager.updateCombatTotals(0, 5, COMBAT_PHASES.BLOCK);
            expect(totalsDiv.innerHTML).toContain('block-stat');
            expect(totalsDiv.innerHTML).toMatch(/Block|Total Block/);
            expect(totalsDiv.innerHTML).toContain('5');
        });

        it('should render attack totals in ATTACK phase', () => {
            combatUIManager.updateCombatTotals(7, 0, COMBAT_PHASES.ATTACK);
            expect(totalsDiv.innerHTML).toContain('attack-stat');
            expect(totalsDiv.innerHTML).toMatch(/Attack|Angriff|Total Attack/);
            expect(totalsDiv.innerHTML).toContain('7');
        });

        it('should render ranged and siege totals in RANGED phase', () => {
            mockUI.game.combatOrchestrator = {
                combatRangedTotal: 4,
                combatSiegeTotal: 2
            };
            combatUIManager.updateCombatTotals(3, 0, COMBAT_PHASES.RANGED);
            expect(totalsDiv.innerHTML).toContain('ranged-stat');
            expect(totalsDiv.innerHTML).toContain('siege-stat');
            expect(totalsDiv.innerHTML).toMatch(/Fernkampf|Ranged/);
            expect(totalsDiv.innerHTML).toMatch(/Belagerung|Siege/);
        });
    });

    describe('Combat Enemy Rendering', () => {
        it('should render enemy with Assassin icon', () => {
            const enemy = new MockEnemy({ 
                id: 'e1', 
                name: 'Assassin', 
                assassin: true,
                armor: 4,
                attack: 5
            });

            const el = combatUIManager.renderEnemy(enemy, 'attack', null);
            
            expect(el.innerHTML).toContain('data-tooltip-key="assassin"');
            expect(el.innerHTML).toContain('🗡️');
        });

        it('should render enemy with Vampirism icon', () => {
            const enemy = new MockEnemy({ 
                id: 'e1', 
                name: 'Vampire', 
                vampiric: true,
                armor: 4
            });

            const el = combatUIManager.renderEnemy(enemy, 'attack', null);
            
            expect(el.innerHTML).toContain('data-tooltip-key="vampiric"');
            expect(el.innerHTML).toContain('🧛');
        });

        it('should render enemy with Poison icon', () => {
            const enemy = new MockEnemy({ 
                id: 'e1', 
                name: 'Venom', 
                poison: true,
                armor: 3
            });

            const el = combatUIManager.renderEnemy(enemy, 'attack', null);
            
            expect(el.innerHTML).toContain('data-tooltip-key="poison"');
            expect(el.innerHTML).toContain('🤢');
        });

        it('should render enemy with Fortified icon', () => {
            const enemy = new MockEnemy({ 
                id: 'e1', 
                name: 'Fortified', 
                fortified: true,
                armor: 5
            });

            const el = combatUIManager.renderEnemy(enemy, 'attack', null);
            
            expect(el.innerHTML).toContain('data-tooltip-key="fortified"');
            expect(el.innerHTML).toContain('🏰');
        });

        it('should render enemy with Swift icon', () => {
            const enemy = new MockEnemy({ 
                id: 'e1', 
                name: 'Swift', 
                swift: true,
                armor: 3
            });

            const el = combatUIManager.renderEnemy(enemy, 'attack', null);
            
            expect(el.innerHTML).toContain('data-tooltip-key="swift"');
            expect(el.innerHTML).toContain('💨');
        });

        it('should render enemy with correct armor value', () => {
            const enemy = new MockEnemy({ armor: 7 });
            const el = combatUIManager.renderEnemy(enemy, 'attack', null);
            
            expect(el.innerHTML).toContain('7');
        });

        it('should render blocked enemy with blocked badge', () => {
            const enemy = new MockEnemy({ id: 'e1', name: 'Orc', armor: 3 });
            mockUI.game.combat.blockedEnemies = new Set(['e1']);
            
            const el = combatUIManager.renderEnemy(enemy, 'block', null);
            
            expect(el.classList.contains('blocked-enemy')).toBe(true);
            // i18n: DE "[GEBLOCKT]" / EN "[BLOCKED]"
            expect(el.querySelector('.blocked-label')?.textContent).toMatch(/\[(GEBLOCKT|BLOCKED)\]/);
        });

        it('should render boss enemy with health bar', () => {
            const enemy = new MockEnemy({ 
                id: 'boss1', 
                name: 'Volkare', 
                isBoss: true,
                armor: 10,
                currentHealth: 30,
                maxHealth: 50,
                color: '#ef4444'
            });

            const el = combatUIManager.renderEnemy(enemy, 'attack', null);
            
            expect(el.classList.contains('boss-card')).toBe(true);
            expect(el.innerHTML).toContain('boss-health-bar');
            expect(el.innerHTML).toContain('30/50 HP');
        });

        it('should render enemy with Brutal icon', () => {
            const enemy = new MockEnemy({ brutal: true });
            const el = combatUIManager.renderEnemy(enemy, 'attack', null);
            
            expect(el.innerHTML).toContain('data-tooltip-key="brutal"');
            expect(el.innerHTML).toContain('👹');
        });

        it('should render enemy with Paralyze icon', () => {
            const enemy = new MockEnemy({ paralyze: true });
            const el = combatUIManager.renderEnemy(enemy, 'attack', null);
            
            expect(el.innerHTML).toContain('data-tooltip-key="paralyze"');
            expect(el.innerHTML).toContain('⚡');
        });

        it('should render enemy with Cumbersome icon', () => {
            const enemy = new MockEnemy({ cumbersome: true });
            const el = combatUIManager.renderEnemy(enemy, 'attack', null);
            
            expect(el.innerHTML).toContain('data-tooltip-key="cumbersome"');
            expect(el.innerHTML).toContain('🏋️');
        });

        it('should render enemy with Summoner icon', () => {
            const enemy = new MockEnemy({ summoner: true });
            const el = combatUIManager.renderEnemy(enemy, 'attack', null);
            
            expect(el.innerHTML).toContain('data-tooltip-key="summoner"');
            expect(el.innerHTML).toContain('🦇');
        });

        it('should render enemy with Elusive icon', () => {
            const enemy = new MockEnemy({ elusive: true });
            const el = combatUIManager.renderEnemy(enemy, 'attack', null);
            
            expect(el.innerHTML).toContain('data-tooltip-key="elusive"');
            expect(el.innerHTML).toContain('👤');
        });

        it('should render enemy with Boss icon', () => {
            const enemy = new MockEnemy({ isBoss: true });
            const el = combatUIManager.renderEnemy(enemy, 'attack', null);
            
            expect(el.innerHTML).toContain('data-tooltip-key="boss"');
            expect(el.innerHTML).toContain('👑');
        });
    });

    describe('Unit Tooltip Integration', () => {
        it('should attach tooltip to unit cards', () => {
            const unit = new MockUnit({
                id: 'unit-1',
                name: 'Test Unit',
                abilities: [
                    { type: ACTION_TYPES.BLOCK, value: 3, element: 'ice', text: '3 Eis-Block' },
                    { type: ACTION_TYPES.ATTACK, value: 2, element: 'fire', text: '2 Feuer-Angriff' }
                ]
            });

            combatUIManager.renderUnitsInCombat([unit], COMBAT_PHASES.BLOCK, () => {});

            const unitCard = container.querySelector('.unit-combat-card');
            
            expect(unitCard).toBeTruthy();
        });
    });

    describe('Edge Cases', () => {
        it('should handle units without abilities', () => {
            const unit = new MockUnit({ id: 'unit-1', name: 'No Abilities', abilities: [] });
            combatUIManager.renderUnitsInCombat([unit], COMBAT_PHASES.BLOCK, () => {});

            const unitCard = container.querySelector('.unit-combat-card');
            
            expect(unitCard).toBeTruthy();
            expect(unitCard.innerHTML).toContain('Keine Aktion');
        });

        it('should handle units without getAbilities method', () => {
            const unit = new MockUnit();
            delete unit.getAbilities;
            combatUIManager.renderUnitsInCombat([unit], COMBAT_PHASES.BLOCK, () => {});

            const unitCard = container.querySelector('.unit-combat-card');
            
            expect(unitCard).toBeTruthy();
            expect(unitCard.innerHTML).toContain('Keine Aktion');
        });

        it('should handle not ready units', () => {
            const unit = new MockUnit({ id: 'unit-1', name: 'Not Ready', ready: false });
            combatUIManager.renderUnitsInCombat([unit], COMBAT_PHASES.BLOCK, () => {});

            const unitCard = container.querySelector('.unit-combat-card');
            
            expect(unitCard.classList.contains('not-ready')).toBe(true);
        });

        it('should handle multiple units correctly', () => {
            const units = [
                new MockUnit({ id: 'u1', name: 'Unit 1', abilities: [{ type: ACTION_TYPES.BLOCK, value: 1 }] }),
                new MockUnit({ id: 'u2', name: 'Unit 2', abilities: [{ type: ACTION_TYPES.BLOCK, value: 2 }] }),
                new MockUnit({ id: 'u3', name: 'Unit 3', abilities: [{ type: ACTION_TYPES.BLOCK, value: 3 }] })
            ];
            combatUIManager.renderUnitsInCombat(units, COMBAT_PHASES.BLOCK, () => {});

            const unitCards = container.querySelectorAll('.unit-combat-card');
            
            expect(unitCards.length).toBe(3);
        });

        it('should handle units with elementBlocks for elemental block rendering', () => {
            const unit = new MockUnit({
                id: 'unit-1',
                name: 'Elemental Unit',
                abilities: [{ type: ACTION_TYPES.BLOCK, value: 3, element: 'ice', text: '3 Eis-Block' }],
                elementBlocks: { ice: 3 }
            });
            combatUIManager.renderUnitsInCombat([unit], COMBAT_PHASES.BLOCK, () => {});

            const unitCard = container.querySelector('.unit-combat-card');
            
            expect(unitCard).toBeTruthy();
            expect(unitCard.innerHTML).toContain('❄️ 3 Eis-Block');
        });

        it('should handle phase NOT_IN_COMBAT gracefully', () => {
            const unit = new MockUnit({ id: 'unit-1', name: 'Test' });
            expect(() => {
                combatUIManager.renderUnitsInCombat([unit], 'not_in_combat', () => {});
            }).not.toThrow();
        });
    });

    describe('getCombatPhaseName', () => {
        it('should return correct German names for all phases', () => {
            expect(combatUIManager.getCombatPhaseName(COMBAT_PHASES.NOT_IN_COMBAT)).toBe('Kein Kampf');
            expect(combatUIManager.getCombatPhaseName(COMBAT_PHASES.RANGED)).toBe('Fernkampf-Phase');
            expect(combatUIManager.getCombatPhaseName(COMBAT_PHASES.BLOCK)).toBe('Block-Phase');
            expect(combatUIManager.getCombatPhaseName(COMBAT_PHASES.DAMAGE)).toBe('Schadens-Phase');
            expect(combatUIManager.getCombatPhaseName(COMBAT_PHASES.ATTACK)).toBe('Angriffs-Phase');
            expect(combatUIManager.getCombatPhaseName(COMBAT_PHASES.COMPLETE)).toBe('Abgeschlossen');
        });

        it('should return phase key for unknown phase', () => {
            expect(combatUIManager.getCombatPhaseName('unknown')).toBe('unknown');
        });
    });

    describe('getPhaseHint', () => {
        it('should return correct hints for combat phases', () => {
            expect(combatUIManager.getPhaseHint(COMBAT_PHASES.RANGED)).toContain('Fernkampf');
            expect(combatUIManager.getPhaseHint(COMBAT_PHASES.BLOCK)).toContain('Blocke');
            expect(combatUIManager.getPhaseHint(COMBAT_PHASES.ATTACK)).toContain('Angriffs');
        });

        it('should return empty string for unknown phase', () => {
            expect(combatUIManager.getPhaseHint('unknown')).toBe('');
        });
    });
});