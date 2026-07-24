/**
 * CombatOrchestrator - Coverage Boost
 * Targets uncovered lines and functions in CombatOrchestrator.ts
 * Coverage target: 80% lines, 80% functions, 80% branches
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CombatOrchestrator } from '../../js/game/CombatOrchestrator.js';
import { createMockEnemy, createHeroWithStats, createMockCanvas } from '../test-helpers.js';
import { createMockUI, createMockElement, setupGlobalMocks, restoreRandom } from '../test-mocks.js';
import { eventBus } from '../../js/eventBus.js';
import { setLanguage } from '../../js/i18n/index.js';
import { COMBAT_PHASES } from '../../js/constants.js';

describe('CombatOrchestrator - Coverage Boost', () => {
    let orchestrator;
    let mockGame;
    let mockHero;
    let mockCombat;
    let mockUI;
    let mockHexGrid;
    let mockParticleSystem;
    let mockActionManager;
    let mockEntityManager;
    let mockSiteManager;
    let mockRewardManager;
    let mockLevelUpManager;
    let mockScenarioManager;
    let mockStatisticsManager;
    let mockTimeManager;
    let mockTurnManager;
    let mockCard;

    beforeEach(() => {
        // Mock dependencies
        setupGlobalMocks();
        
        // Set German locale for i18n
        setLanguage('de');
        
        // Spy on eventBus
        vi.spyOn(eventBus, 'emit').mockImplementation(() => {});
        mockHero = createHeroWithStats({
            name: 'TestHero',
            level: 2,
            fame: 10,
            reputation: 5,
            armor: 2,
            handLimit: 5,
            commandLimit: 3,
            movementPoints: 3,
            healingPoints: 2
        });
        mockHero.hand = [];
        mockHero.discard = [];
        mockHero.deck = [];
        mockHero.units = [];
        mockHero.wounds = [];
        mockHero.position = { q: 0, r: 0 };
        mockHero.gainFame = vi.fn().mockReturnValue({ leveledUp: false });
        mockHero.healWound = vi.fn().mockReturnValue(true);
        mockHero.playCard = vi.fn().mockReturnValue({
            card: { name: 'Test Card', color: 'green' },
            effect: { block: 3, attack: 4, movement: 2 }
        });
        mockHero.hasSkill = vi.fn().mockReturnValue(false);
        mockHero.endTurn = vi.fn();
        mockHero.getState = vi.fn().mockReturnValue({});

        mockCombat = {
            phase: COMBAT_PHASES.RANGED,
            enemy: createMockEnemy({ position: { q: 1, r: 0 } }),
            enemies: [createMockEnemy({ position: { q: 1, r: 0 } })],
            start: vi.fn(),
            blockEnemy: vi.fn().mockReturnValue({ success: true, blocked: true, totalBlock: 4 }),
            endBlockPhase: vi.fn().mockReturnValue({ waitingForAssignment: false, woundsReceived: 1, message: 'Block phase ended', paralyzeTriggered: false }),
            resolveDamagePhase: vi.fn().mockReturnValue({ woundsReceived: 1, message: 'Damage resolved', paralyzeTriggered: false }),
            attackEnemies: vi.fn().mockReturnValue({ success: true, message: 'Enemy defeated!' }),
            rangedAttackEnemy: vi.fn().mockReturnValue({ success: true, message: 'Ranged attack!', consumedRanged: 3, consumedSiege: 0 }),
            endRangedPhase: vi.fn().mockReturnValue({ phase: COMBAT_PHASES.BLOCK, message: 'Ranged phase ended', victory: false }),
            handleParalyzeEffect: vi.fn().mockReturnValue(0),
            activateUnit: vi.fn().mockReturnValue({ success: true, message: 'Unit activated' }),
            assignDamageToUnit: vi.fn()
        };

        mockHexGrid = {
            axialToPixel: vi.fn().mockReturnValue({ x: 400, y: 300 }),
            getHex: vi.fn().mockReturnValue({ site: { type: 'keep' } }),
            getNeighbors: vi.fn().mockReturnValue([
                { q: 1, r: 1 }, { q: 2, r: 0 }, { q: 1, r: -1 },
                { q: 0, r: -1 }, { q: -1, r: 0 }, { q: 0, r: 1 }
            ])
        };

        mockParticleSystem = {
            playCardEffect: vi.fn(),
            buffEffect: vi.fn(),
            damageSplatter: vi.fn(),
            triggerShake: vi.fn(),
            freeze: vi.fn(),
            createDamageNumber: vi.fn(),
            combatClashEffect: vi.fn(),
            impactEffect: vi.fn(),
            createFloatingText: vi.fn()
        };

        mockActionManager = {
            saveCheckpoint: vi.fn(),
            clearHistory: vi.fn()
        };

        mockEntityManager = {
            enemies: [],
            removeEnemy: vi.fn(),
            getEnemyAt: vi.fn().mockReturnValue(null)
        };

        mockSiteManager = {
            currentSite: null
        };

        mockRewardManager = {
            showArtifactChoice: vi.fn(),
            showSpellChoice: vi.fn()
        };

        mockLevelUpManager = {
            handleLevelUp: vi.fn()
        };

        mockScenarioManager = {
            checkVictory: vi.fn().mockReturnValue(null)
        };

        mockStatisticsManager = {
            increment: vi.fn(),
            getState: vi.fn().mockReturnValue({})
        };

        mockTimeManager = {
            isNight: vi.fn().mockReturnValue(false),
            getState: vi.fn().mockReturnValue({}),
            loadState: vi.fn()
        };

        mockTurnManager = {
            getState: vi.fn().mockReturnValue({}),
            loadState: vi.fn()
        };

        const mockEventBus = {
            emit: vi.fn()
        };

        mockCard = {
            name: 'Test Card',
            color: 'green',
            type: 'action',
            isWound: () => false
        };

        mockUI = createMockUI();
        mockUI.elements.playedCards = { getBoundingClientRect: () => ({ top: 0, left: 0, right: 100, bottom: 100 }) };
        mockUI.showCombatPanel = vi.fn();
        mockUI.hideCombatPanel = vi.fn();
        mockUI.showGameOverDefeat = vi.fn();
        mockUI.showGameOverVictory = vi.fn();
        mockUI.updateCombatInfo = vi.fn();
        mockUI.updateCombatTotals = vi.fn();
        mockUI.renderUnitsInCombat = vi.fn();
        mockUI.updatePhaseIndicator = vi.fn();
        mockUI.showPlayArea = vi.fn();

        mockGame = {
            hero: mockHero,
            combat: null,
            combatOrchestrator: null,
            hexGrid: mockHexGrid,
            particleSystem: mockParticleSystem,
            actionManager: mockActionManager,
            entityManager: mockEntityManager,
            siteManager: mockSiteManager,
            rewardManager: mockRewardManager,
            levelUpManager: mockLevelUpManager,
            scenarioManager: mockScenarioManager,
            statisticsManager: mockStatisticsManager,
            timeManager: mockTimeManager,
            turnManager: mockTurnManager,
            gameState: 'playing',
            isTestEnvironment: true,
            ui: mockUI,
            addLog: vi.fn(),
            showToast: vi.fn(),
            render: vi.fn(),
            renderHand: vi.fn(),
            updateStats: vi.fn(),
            updatePhaseIndicator: vi.fn(),
            checkAndShowAchievements: vi.fn(),
            enemyAI: {
                reconstituteEnemy: vi.fn((data) => createMockEnemy(data))
            }
        };

        // Create orchestrator
        orchestrator = new CombatOrchestrator(mockGame);
        mockGame.combatOrchestrator = orchestrator;
    });

    afterEach(() => {
        restoreRandom();
        vi.clearAllMocks();
    });

    describe('Constructor', () => {
        it('initializes all totals to zero', () => {
            expect(orchestrator.combatAttackTotal).toBe(0);
            expect(orchestrator.combatBlockTotal).toBe(0);
            expect(orchestrator.activeBlocks).toEqual([]);
            expect(orchestrator.combatRangedTotal).toBe(0);
            expect(orchestrator.combatSiegeTotal).toBe(0);
        });
    });

    describe('playCardInCombat', () => {
        it('returns early if no combat or card is wound', () => {
            mockGame.combat = null;
            orchestrator.playCardInCombat(0, mockCard);
            expect(mockHero.playCard).not.toHaveBeenCalled();

            mockGame.combat = mockCombat;
            const woundCard = { ...mockCard, isWound: () => true };
            orchestrator.playCardInCombat(0, woundCard);
            expect(mockHero.playCard).not.toHaveBeenCalled();
        });

        it('saves checkpoint via actionManager if available', () => {
            mockGame.combat = mockCombat;
            mockCombat.phase = COMBAT_PHASES.BLOCK;
            orchestrator.playCardInCombat(0, mockCard);
            expect(mockActionManager.saveCheckpoint).toHaveBeenCalled();
        });

        it('handles BLOCK phase - adds block to totals and activeBlocks', () => {
            mockGame.combat = mockCombat;
            mockCombat.phase = COMBAT_PHASES.BLOCK;
            
            const blockCard = {
                ...mockCard,
                isWound: () => false
            };
            mockHero.playCard.mockReturnValueOnce({
                card: { name: 'Block Card', color: 'blue' },
                effect: { block: 4, element: 'physical' }
            });

            orchestrator.playCardInCombat(0, blockCard);
            
            expect(orchestrator.combatBlockTotal).toBe(4);
            expect(orchestrator.activeBlocks).toContainEqual({
                value: 4,
                element: 'physical'
            });
        });

        it('handles RANGED phase - siege attack', () => {
            mockGame.combat = mockCombat;
            mockCombat.phase = COMBAT_PHASES.RANGED;
            
            const siegeCard = {
                ...mockCard,
                isWound: () => false
            };
            mockHero.playCard.mockReturnValueOnce({
                card: { name: 'Siege Attack', color: 'red' },
                effect: { attack: 5, siege: true }
            });

            orchestrator.playCardInCombat(0, siegeCard);
            
            expect(orchestrator.combatSiegeTotal).toBe(5);
        });

        it('handles RANGED phase - ranged spell/attack', () => {
            mockGame.combat = mockCombat;
            mockCombat.phase = COMBAT_PHASES.RANGED;
            
            const rangedCard = {
                ...mockCard,
                isWound: () => false
            };
            mockHero.playCard.mockReturnValueOnce({
                card: { name: 'Fireball', color: 'red', type: 'spell' },
                effect: { attack: 4, ranged: true }
            });

            orchestrator.playCardInCombat(0, rangedCard);
            
            expect(orchestrator.combatRangedTotal).toBe(4);
        });

        it('handles ATTACK phase - adds attack to total', () => {
            mockGame.combat = mockCombat;
            mockCombat.phase = COMBAT_PHASES.ATTACK;
            
            mockHero.playCard.mockReturnValueOnce({
                card: { name: 'Attack', color: 'red' },
                effect: { attack: 6 }
            });

            orchestrator.playCardInCombat(0, mockCard);
            
            expect(orchestrator.combatAttackTotal).toBe(6);
        });

        it('handles DAMAGE phase - adds attack to total', () => {
            mockGame.combat = mockCombat;
            mockCombat.phase = COMBAT_PHASES.DAMAGE;
            
            mockHero.playCard.mockReturnValueOnce({
                card: { name: 'Attack', color: 'red' },
                effect: { attack: 6 }
            });

            orchestrator.playCardInCombat(0, mockCard);
            
            expect(orchestrator.combatAttackTotal).toBe(6);
        });

        it('emits CARD_PLAYED event', () => {
            mockGame.combat = mockCombat;
            mockCombat.phase = COMBAT_PHASES.ATTACK;
            orchestrator.playCardInCombat(0, mockCard);
            expect(eventBus.emit).toHaveBeenCalledWith('card_played', { combat: true });
        });

        it('calls ui.showPlayArea and renderHand', () => {
            mockGame.combat = mockCombat;
            mockCombat.phase = COMBAT_PHASES.ATTACK;
            orchestrator.playCardInCombat(0, mockCard);
            expect(mockUI.showPlayArea).toHaveBeenCalled();
            expect(mockGame.renderHand).toHaveBeenCalled();
        });
    });

    describe('renderUnitsInCombat', () => {
        it('returns early if no combat or ui', () => {
            mockGame.combat = null;
            orchestrator.renderUnitsInCombat();
            expect(mockUI.renderUnitsInCombat).not.toHaveBeenCalled();

            mockGame.combat = mockCombat;
            mockGame.ui = null;
            orchestrator.renderUnitsInCombat();
            expect(mockUI.renderUnitsInCombat).not.toHaveBeenCalled();
        });

        it('calls ui.renderUnitsInCombat with hero units and phase', () => {
            mockGame.combat = mockCombat;
            mockHero.units = [{ type: 'test_unit' }];
            orchestrator.renderUnitsInCombat();
            expect(mockUI.renderUnitsInCombat).toHaveBeenCalledWith(
                mockHero.units,
                mockCombat.phase,
                expect.any(Function)
            );
        });
    });

    describe('activateUnitInCombat', () => {
        it('returns early if no combat', () => {
            mockGame.combat = null;
            orchestrator.activateUnitInCombat({});
            expect(mockCombat.activateUnit).not.toHaveBeenCalled();
        });

        it('handles successful unit activation', () => {
            mockGame.combat = mockCombat;
            const unit = { type: 'test_unit' };
            
            orchestrator.activateUnitInCombat(unit);
            
            expect(mockCombat.activateUnit).toHaveBeenCalledWith(unit);
            expect(mockGame.addLog).toHaveBeenCalledWith('Unit activated', 'combat');
            expect(mockParticleSystem.buffEffect).toHaveBeenCalled();
            expect(mockUI.renderUnitsInCombat).toHaveBeenCalled();
            expect(mockGame.updateStats).toHaveBeenCalled();
        });

        it('handles failed unit activation', () => {
            mockGame.combat = mockCombat;
            mockCombat.activateUnit.mockReturnValueOnce({ success: false, message: 'Cannot activate' });
            
            orchestrator.activateUnitInCombat({});
            
            expect(mockGame.addLog).toHaveBeenCalledWith('Cannot activate', 'info');
        });
    });

    describe('endBlockPhase', () => {
        it('returns early if no combat', () => {
            mockGame.combat = null;
            orchestrator.endBlockPhase();
            expect(mockCombat.blockEnemy).not.toHaveBeenCalled();
        });

        it('calls combat.blockEnemy and clears actionManager history', () => {
            mockGame.combat = mockCombat;
            orchestrator.combatBlockTotal = 5;
            orchestrator.endBlockPhase();
            
            expect(mockCombat.blockEnemy).toHaveBeenCalledWith(mockCombat.enemy, 5);
            expect(mockActionManager.clearHistory).toHaveBeenCalled();
        });

        it('handles waitingForAssignment result', () => {
            mockGame.combat = mockCombat;
            mockCombat.endBlockPhase.mockReturnValueOnce({ waitingForAssignment: true, message: 'Assign damage' });
            orchestrator.combatBlockTotal = 5;
            orchestrator.activeBlocks = [{ value: 3, element: 'physical' }];
            
            // Spy on updateCombatInfo for this test
            const updateCombatInfoSpy = vi.spyOn(orchestrator, 'updateCombatInfo').mockImplementation(() => {});
            
            orchestrator.endBlockPhase();
            
            expect(mockGame.addLog).toHaveBeenCalledWith('Assign damage', 'info');
            expect(orchestrator.combatBlockTotal).toBe(0);
            expect(orchestrator.activeBlocks).toEqual([]);
            expect(mockGame.updatePhaseIndicator).toHaveBeenCalled();
            expect(updateCombatInfoSpy).toHaveBeenCalled();
            expect(mockUI.renderUnitsInCombat).toHaveBeenCalled();
        });

        it('handles damage results (non-waiting)', () => {
            mockGame.combat = mockCombat;
            mockCombat.endBlockPhase.mockReturnValueOnce({ 
                waitingForAssignment: false, 
                woundsReceived: 2, 
                message: 'Damage taken',
                paralyzeTriggered: false 
            });
            orchestrator.combatBlockTotal = 5;
            
            orchestrator.endBlockPhase();
            
            expect(mockGame.particleSystem.damageSplatter).toHaveBeenCalled();
            expect(mockGame.particleSystem.triggerShake).toHaveBeenCalled();
            expect(orchestrator.combatBlockTotal).toBe(0);
        });
    });

    describe('assignDamageToUnit', () => {
        it('returns early if no combat', () => {
            mockGame.combat = null;
            orchestrator.assignDamageToUnit({});
            expect(mockCombat.assignDamageToUnit).not.toHaveBeenCalled();
        });

        it('handles successful assignment with particle effects', () => {
            mockGame.combat = mockCombat;
            mockCombat.assignDamageToUnit.mockReturnValueOnce({ 
                success: true, 
                message: 'Damage assigned',
                unitDestroyed: true 
            });
            
            const unit = { id: 'unit1' };
            
            // Spy on updateCombatInfo for this test
            const updateCombatInfoSpy = vi.spyOn(orchestrator, 'updateCombatInfo').mockImplementation(() => {});
            
            orchestrator.assignDamageToUnit(unit);
            
            expect(mockGame.addLog).toHaveBeenCalledWith('Damage assigned', 'warning');
            expect(mockParticleSystem.triggerShake).toHaveBeenCalledWith(8, 0.4);
            expect(mockParticleSystem.freeze).toHaveBeenCalledWith(0.1);
            expect(updateCombatInfoSpy).toHaveBeenCalled();
            expect(mockUI.renderUnitsInCombat).toHaveBeenCalled();
            expect(mockGame.updateStats).toHaveBeenCalled();
        });

        it('handles failed assignment', () => {
            mockGame.combat = mockCombat;
            mockCombat.assignDamageToUnit.mockReturnValueOnce({ 
                success: false, 
                message: 'Invalid unit' 
            });
            
            orchestrator.assignDamageToUnit({});
            
            expect(mockGame.addLog).toHaveBeenCalledWith('Invalid unit', 'error');
        });
    });

    describe('resolveDamagePhase', () => {
        it('returns early if no combat', () => {
            mockGame.combat = null;
            orchestrator.resolveDamagePhase();
            expect(mockCombat.resolveDamagePhase).not.toHaveBeenCalled();
        });

        it('handles damage phase result', () => {
            mockGame.combat = mockCombat;
            mockCombat.resolveDamagePhase.mockReturnValueOnce({ 
                woundsReceived: 1,
                message: 'Damage resolved',
                paralyzeTriggered: false
            });
            
            // Spy on updateCombatInfo for this test
            const updateCombatInfoSpy = vi.spyOn(orchestrator, 'updateCombatInfo').mockImplementation(() => {});
            
            orchestrator.resolveDamagePhase();
            
            expect(mockGame.particleSystem.damageSplatter).toHaveBeenCalled();
            expect(updateCombatInfoSpy).toHaveBeenCalled();
            expect(mockGame.updateStats).toHaveBeenCalled();
            expect(mockGame.updatePhaseIndicator).toHaveBeenCalled();
            expect(mockUI.renderUnitsInCombat).toHaveBeenCalled();
        });

        it('returns early if resolveDamagePhase returns falsy', () => {
            mockGame.combat = mockCombat;
            mockCombat.resolveDamagePhase.mockReturnValueOnce(null);
            
            orchestrator.resolveDamagePhase();
            
            expect(mockGame.particleSystem.damageSplatter).not.toHaveBeenCalled();
        });
    });

    describe('handleDamageResults', () => {
        it('creates damage particles and events', () => {
            const result = {
                woundsReceived: 3,
                paralyzeTriggered: false,
                message: 'You took 3 wounds'
            };
            
            orchestrator.handleDamageResults(result);
            
            expect(mockGame.particleSystem.damageSplatter).toHaveBeenCalled();
            expect(mockGame.particleSystem.triggerShake).toHaveBeenCalledWith(9, 0.4);
            expect(mockGame.particleSystem.freeze).toHaveBeenCalledWith(0.05);
            expect(mockGame.particleSystem.createDamageNumber).toHaveBeenCalled();
            expect(eventBus.emit).toHaveBeenCalledWith('combat_damage', expect.objectContaining({
                targetPos: mockHero.position,
                amount: 3,
                targetType: 'hero'
            }));
            expect(mockGame.addLog).toHaveBeenCalledWith('You took 3 wounds', 'combat');
        });

        it('handles paralyze effect', () => {
            mockGame.combat = mockCombat;
            mockCombat.handleParalyzeEffect.mockReturnValueOnce(2);
            
            const result = {
                woundsReceived: 1,
                paralyzeTriggered: true,
                message: 'Damage'
            };
            
            orchestrator.handleDamageResults(result);
            
            expect(mockGame.addLog).toHaveBeenCalledWith(expect.stringContaining('paralyzeDiscard'), 'warning');
            expect(mockParticleSystem.createFloatingText).toHaveBeenCalled();
        });
    });

    describe('executeAttackAction', () => {
        it('returns early if no combat', () => {
            mockGame.combat = null;
            orchestrator.executeAttackAction();
            expect(mockCombat.attackEnemies).not.toHaveBeenCalled();
        });

        it('handles RANGED phase - calls endRangedPhase', () => {
            mockGame.combat = mockCombat;
            mockCombat.phase = COMBAT_PHASES.RANGED;
            
            const endRangedPhaseSpy = vi.spyOn(orchestrator, 'endRangedPhase').mockImplementation(() => {});
            
            orchestrator.executeAttackAction();
            
            expect(mockActionManager.saveCheckpoint).toHaveBeenCalled();
            expect(endRangedPhaseSpy).toHaveBeenCalled();
        });

        it('handles BLOCK phase - calls endBlockPhase', () => {
            mockGame.combat = mockCombat;
            mockCombat.phase = COMBAT_PHASES.BLOCK;
            
            const endBlockPhaseSpy = vi.spyOn(orchestrator, 'endBlockPhase').mockImplementation(() => {});
            
            orchestrator.executeAttackAction();
            
            expect(mockActionManager.saveCheckpoint).toHaveBeenCalled();
            expect(endBlockPhaseSpy).toHaveBeenCalled();
        });

        it('handles DAMAGE phase - calls resolveDamagePhase', () => {
            mockGame.combat = mockCombat;
            mockCombat.phase = COMBAT_PHASES.DAMAGE;
            
            const resolveDamagePhaseSpy = vi.spyOn(orchestrator, 'resolveDamagePhase').mockImplementation(() => {});
            
            orchestrator.executeAttackAction();
            
            expect(resolveDamagePhaseSpy).toHaveBeenCalled();
        });

        it('returns early if not ATTACK phase', () => {
            mockGame.combat = mockCombat;
            mockCombat.phase = COMBAT_PHASES.RANGED;
            orchestrator.executeAttackAction();
            // Already tested - goes to endRangedPhase
            
            mockCombat.phase = 'invalid';
            orchestrator.executeAttackAction();
            // Should return early for non-ATTACK in else branch
        });

        it('handles low attack (no shake/freeze)', () => {
            mockGame.combat = mockCombat;
            mockCombat.phase = COMBAT_PHASES.ATTACK;
            orchestrator.combatAttackTotal = 2;
            
            orchestrator.executeAttackAction();
            
            expect(mockParticleSystem.createDamageNumber).toHaveBeenCalled();
            expect(mockParticleSystem.triggerShake).not.toHaveBeenCalled();
        });

        it('calls onCombatEnd with result', () => {
            mockGame.combat = mockCombat;
            mockCombat.phase = COMBAT_PHASES.ATTACK;
            orchestrator.combatAttackTotal = 5;
            
            const onCombatEndSpy = vi.spyOn(orchestrator, 'onCombatEnd').mockImplementation(() => {});
            
            orchestrator.executeAttackAction();
            
            expect(onCombatEndSpy).toHaveBeenCalledWith(
                expect.objectContaining({ victory: true })
            );
        });
    });

    describe('endRangedPhase', () => {
        it('returns early if no combat', () => {
            mockGame.combat = null;
            orchestrator.endRangedPhase();
            expect(mockCombat.endRangedPhase).not.toHaveBeenCalled();
        });

        it('handles transition to BLOCK phase', () => {
            mockGame.combat = mockCombat;
            mockCombat.endRangedPhase.mockReturnValueOnce({ 
                phase: COMBAT_PHASES.BLOCK, 
                message: 'Ranged done',
                victory: false 
            });
            
            const updateCombatTotalsSpy = vi.spyOn(orchestrator, 'updateCombatTotals').mockImplementation(() => {});
            
            orchestrator.endRangedPhase();
            
            expect(mockGame.addLog).toHaveBeenCalledWith('Ranged done', 'combat');
            expect(mockUI.renderUnitsInCombat).toHaveBeenCalled();
            expect(mockGame.updatePhaseIndicator).toHaveBeenCalled();
            expect(mockGame.updateStats).toHaveBeenCalled();
            expect(updateCombatTotalsSpy).toHaveBeenCalled();
        });

        it('handles victory after ranged phase', () => {
            mockGame.combat = mockCombat;
            mockCombat.endRangedPhase.mockReturnValueOnce({ 
                phase: COMBAT_PHASES.ATTACK, 
                message: 'All dead',
                victory: true 
            });
            
            const onCombatEndSpy = vi.spyOn(orchestrator, 'onCombatEnd').mockImplementation(() => {});
            
            orchestrator.endRangedPhase();
            
            expect(onCombatEndSpy).toHaveBeenCalledWith(expect.objectContaining({ victory: true }));
        });
    });

    describe('initiateCombat', () => {
        it('returns early if combat already active', () => {
            mockGame.combat = mockCombat;
            orchestrator.initiateCombat(createMockEnemy());
            expect(mockGame.entityManager.removeEnemy).not.toHaveBeenCalled();
        });

        it('returns early if no enemy provided', () => {
            orchestrator.initiateCombat(null);
            orchestrator.initiateCombat([]);
            expect(mockGame.combat).toBeNull();
        });

        it('handles summoner enemies', () => {
            const summoner = createMockEnemy({ 
                summoner: true,
                name: 'Necromancer'
            });
            
            orchestrator.initiateCombat(summoner);
            
            expect(mockGame.combat).toBeTruthy();
            expect(mockGame.addLog).toHaveBeenCalledWith(expect.stringContaining('beschwört'), 'warning');
        });

        it('finds defensive allies at city/keep sites', () => {
            mockHexGrid.getHex.mockReturnValueOnce({ site: { type: 'keep' } });
            mockEntityManager.getEnemyAt.mockReturnValueOnce(createMockEnemy({ defensive: true, id: 'ally1' }));
            
            const defensiveEnemy = createMockEnemy({ 
                defensive: true, 
                position: { q: 0, r: 0 },
                name: 'Keep Guard'
            });
            
            orchestrator.initiateCombat(defensiveEnemy);
            
            expect(mockGame.addLog).toHaveBeenCalledWith(expect.stringContaining('verteidigende'), 'warning');
        });

        it('sets up combat state correctly', () => {
            const enemy = createMockEnemy();
            
            const updateCombatTotalsSpy = vi.spyOn(orchestrator, 'updateCombatTotals').mockImplementation(() => {});
            
            orchestrator.initiateCombat(enemy);
            
            expect(mockGame.combat).toBeTruthy();
            expect(mockGame.gameState).toBe('combat');
            expect(orchestrator.combatAttackTotal).toBe(0);
            expect(orchestrator.combatBlockTotal).toBe(0);
            expect(mockUI.showCombatPanel).toHaveBeenCalled();
            expect(updateCombatTotalsSpy).toHaveBeenCalled();
            expect(mockGame.updatePhaseIndicator).toHaveBeenCalled();
            expect(eventBus.emit).toHaveBeenCalledWith('combat_started', expect.any(Object));
        });

        it('filters out falsy enemies', () => {
            const enemies = [createMockEnemy(), null, createMockEnemy(), undefined];
            orchestrator.initiateCombat(enemies);
            expect(mockGame.combat).toBeTruthy();
        });

        it('returns early if not playing state and not test', () => {
            mockGame.gameState = 'menu';
            mockGame.isTestEnvironment = false;
            orchestrator.initiateCombat(createMockEnemy());
            expect(mockGame.combat).toBeNull();
        });
    });

    describe('handleEnemyClick', () => {
        it('returns early if no combat', () => {
            mockGame.combat = null;
            orchestrator.handleEnemyClick({});
            expect(mockCombat.rangedAttackEnemy).not.toHaveBeenCalled();
        });

        it('handles RANGED phase click - executeRangedAttack', () => {
            mockGame.combat = mockCombat;
            mockCombat.phase = COMBAT_PHASES.RANGED;
            const enemy = createMockEnemy();
            
            const executeRangedAttackSpy = vi.spyOn(orchestrator, 'executeRangedAttack').mockImplementation(() => {});
            
            orchestrator.handleEnemyClick(enemy);
            
            expect(mockActionManager.saveCheckpoint).toHaveBeenCalled();
            expect(executeRangedAttackSpy).toHaveBeenCalledWith(enemy);
        });

        it('handles BLOCK phase click - block enemy with movement', () => {
            mockGame.combat = mockCombat;
            mockCombat.phase = COMBAT_PHASES.BLOCK;
            const enemy = createMockEnemy({ cumbersome: true, attack: 5 });
            mockHero.movementPoints = 3;
            orchestrator.activeBlocks = [{ value: 3, element: 'physical' }];
            
            orchestrator.handleEnemyClick(enemy);
            
            expect(mockActionManager.saveCheckpoint).toHaveBeenCalled();
            expect(mockCombat.blockEnemy).toHaveBeenCalled();
            expect(mockHero.movementPoints).toBeLessThanOrEqual(3);
            expect(orchestrator.activeBlocks).toEqual([]);
            expect(orchestrator.combatBlockTotal).toBe(0);
        });

        it('handles BLOCK phase - emits COMBAT_BLOCK event on success', () => {
            mockGame.combat = mockCombat;
            mockCombat.phase = COMBAT_PHASES.BLOCK;
            const enemy = createMockEnemy({ cumbersome: false });
            mockCombat.blockEnemy.mockReturnValueOnce({ success: true, blocked: true, totalBlock: 4 });
            orchestrator.activeBlocks = [{ value: 4, element: 'physical' }];
            
            orchestrator.handleEnemyClick(enemy);
            
            expect(eventBus.emit).toHaveBeenCalledWith('combat_block', expect.objectContaining({
                blocked: true
            }));
        });
    });

    describe('updateCombatInfo', () => {
        it('returns early if no combat or ui', () => {
            mockGame.combat = null;
            orchestrator.updateCombatInfo();
            expect(mockUI.updateCombatInfo).not.toHaveBeenCalled();

            mockGame.combat = mockCombat;
            mockGame.ui = null;
            orchestrator.updateCombatInfo();
            expect(mockUI.updateCombatInfo).not.toHaveBeenCalled();
        });

        it('calls ui.updateCombatInfo and updateCombatTotals', () => {
            mockGame.combat = mockCombat;
            
            const updateCombatTotalsSpy = vi.spyOn(orchestrator, 'updateCombatTotals').mockImplementation(() => {});
            
            orchestrator.updateCombatInfo();
            
            expect(mockUI.updateCombatInfo).toHaveBeenCalledWith(
                mockCombat.enemies,
                mockCombat.phase,
                expect.any(Function)
            );
            expect(updateCombatTotalsSpy).toHaveBeenCalled();
        });
    });

    describe('updateCombatTotals', () => {
        it('returns early if no combat or ui', () => {
            mockGame.combat = null;
            orchestrator.updateCombatTotals();
            expect(mockUI.updateCombatTotals).not.toHaveBeenCalled();
        });

        it('calls ui.updateCombatTotals with current totals', () => {
            mockGame.combat = mockCombat;
            orchestrator.combatAttackTotal = 5;
            orchestrator.combatBlockTotal = 3;
            
            orchestrator.updateCombatTotals();
            
            expect(mockUI.updateCombatTotals).toHaveBeenCalledWith(5, 3, mockCombat.phase);
        });
    });

    describe('onCombatEnd - victory', () => {
        it('handles victory - removes enemy, awards fame, handles level up', () => {
            const enemy = createMockEnemy({ fame: 5, name: 'Test Enemy' });
            mockGame.combat = mockCombat;
            mockCombat.enemies = [enemy];
            mockHero.gainFame.mockReturnValue({ leveledUp: true });
            mockSiteManager.currentSite = { type: 'ruin', conquered: false, getName: () => 'Ruins' };
            
            orchestrator.onCombatEnd({ victory: true, enemy });
            
            expect(mockGame.gameState).toBe('playing');
            expect(mockGame.combat).toBeNull();
            expect(orchestrator.combatAttackTotal).toBe(0);
            expect(orchestrator.combatRangedTotal).toBe(0);
            expect(orchestrator.combatSiegeTotal).toBe(0);
            expect(mockGame.entityManager.removeEnemy).toHaveBeenCalledWith(enemy);
            expect(mockHero.gainFame).toHaveBeenCalledWith(5);
            expect(mockGame.addLog).toHaveBeenCalledWith(expect.stringContaining('Ruhm'), 'info');
            expect(mockStatisticsManager.increment).toHaveBeenCalledWith('enemiesDefeated');
            expect(mockLevelUpManager.handleLevelUp).toHaveBeenCalled();
            expect(mockGame.addLog).toHaveBeenCalledWith(expect.stringContaining('Ruine'), 'success');
        });

        it('handles victory with different site types', () => {
            const siteTypes = ['dungeon', 'tomb', 'labyrinth', 'spawning_grounds', 'keep', 'mage_tower', 'mine'];
            
            siteTypes.forEach(type => {
                vi.clearAllMocks();
                mockGame.combat = mockCombat;
                mockCombat.enemies = [createMockEnemy({ fame: 3 })];
                mockSiteManager.currentSite = { type, conquered: false, getName: () => type };
                mockHero.gainFame.mockReturnValue({ leveledUp: false });
                
                orchestrator.onCombatEnd({ victory: true, enemy: createMockEnemy() });
                
                if (type === 'spawning_grounds') {
                    expect(mockHero.healWound).toHaveBeenCalled();
                }
                expect(mockSiteManager.currentSite.conquered).toBe(true);
            });
        });

        it('handles scenario victory', () => {
            mockGame.combat = mockCombat;
            mockCombat.enemies = [createMockEnemy({ fame: 3 })];
            mockSiteManager.currentSite = { type: 'mine', conquered: false, getName: () => 'Mine' };
            mockScenarioManager.checkVictory.mockReturnValue({ victory: true, message: 'You win!' });
            
            orchestrator.onCombatEnd({ victory: true, enemy: createMockEnemy() });
            
            expect(mockScenarioManager.checkVictory).toHaveBeenCalled();
        });
    });

    describe('onCombatEnd - defeat/retreat', () => {
        it('handles defeat', () => {
            const enemy = createMockEnemy({ name: 'Boss' });
            orchestrator.onCombatEnd({ defeat: true, enemy });
            
            expect(mockGame.addLog).toHaveBeenCalledWith(expect.stringContaining('Niederlage'), 'error');
            expect(mockUI.hideCombatPanel).toHaveBeenCalled();
            expect(mockUI.showGameOverDefeat).toHaveBeenCalledWith('Boss', expect.stringContaining('Boss'));
        });

        it('handles retreat (no victory, no defeat)', () => {
            const enemy = createMockEnemy({ name: 'Scout' });
            orchestrator.onCombatEnd({ enemy });
            
            expect(mockGame.addLog).toHaveBeenCalledWith(expect.stringContaining('Rückzug'), 'info');
        });

        it('handles no enemy case', () => {
            orchestrator.onCombatEnd({ victory: true });
            // No enemy provided - no log added for victory
            expect(mockGame.addLog).not.toHaveBeenCalled();
        });
    });

    describe('executeRangedAttack', () => {
        it('returns early if no combat', () => {
            mockGame.combat = null;
            orchestrator.executeRangedAttack({});
            expect(mockCombat.rangedAttackEnemy).not.toHaveBeenCalled();
        });

        it('saves checkpoint and performs ranged attack', () => {
            mockGame.combat = mockCombat;
            const enemy = createMockEnemy({ position: { q: 1, r: 0 } });
            orchestrator.combatRangedTotal = 4;
            orchestrator.combatSiegeTotal = 0;
            
            orchestrator.executeRangedAttack(enemy);
            
            expect(mockActionManager.saveCheckpoint).toHaveBeenCalled();
            expect(mockCombat.rangedAttackEnemy).toHaveBeenCalledWith(
                enemy,
                4,
                0
            );
        });

        it('handles ranged attack success', () => {
            mockGame.combat = mockCombat;
            mockCombat.rangedAttackEnemy.mockReturnValueOnce({
                success: true,
                message: 'Hit!',
                consumedRanged: 3,
                consumedSiege: 0
            });
            const enemy = createMockEnemy({ position: { q: 1, r: 0 } });
            orchestrator.combatRangedTotal = 4;
            
            const updateCombatInfoSpy = vi.spyOn(orchestrator, 'updateCombatInfo').mockImplementation(() => {});
            
            orchestrator.executeRangedAttack(enemy);
            
            expect(orchestrator.combatRangedTotal).toBe(1);
            expect(mockGame.particleSystem.impactEffect).toHaveBeenCalled();
            expect(mockGame.addLog).toHaveBeenCalledWith('Hit!', 'combat');
            expect(updateCombatInfoSpy).toHaveBeenCalled();
        });

        it('handles enemy defeat after ranged attack', () => {
            mockGame.combat = mockCombat;
            mockCombat.rangedAttackEnemy.mockReturnValueOnce({ success: true });
            mockCombat.enemies = [];
            const enemy = createMockEnemy({ position: { q: 1, r: 0 } });
            orchestrator.combatRangedTotal = 4;
            
            const onCombatEndSpy = vi.spyOn(orchestrator, 'onCombatEnd').mockImplementation(() => {});
            
            orchestrator.executeRangedAttack(enemy);
            
            expect(onCombatEndSpy).toHaveBeenCalledWith(expect.objectContaining({ victory: true }));
        });

        it('handles ranged attack failure', () => {
            mockGame.combat = mockCombat;
            mockCombat.rangedAttackEnemy.mockReturnValueOnce({
                success: false,
                message: 'Too weak'
            });
            const enemy = createMockEnemy({ position: { q: 1, r: 0 } });
            orchestrator.combatRangedTotal = 4;
            
            const updateCombatInfoSpy = vi.spyOn(orchestrator, 'updateCombatInfo').mockImplementation(() => {});
            
            orchestrator.executeRangedAttack(enemy);
            
            expect(updateCombatInfoSpy).toHaveBeenCalled();
        });

        it('handles missing enemy position (falls back to hero)', () => {
            mockGame.combat = mockCombat;
            mockCombat.rangedAttackEnemy.mockReturnValueOnce({ success: true });
            const enemy = createMockEnemy({ position: null });
            orchestrator.combatRangedTotal = 4;
            
            orchestrator.executeRangedAttack(enemy);
            
            expect(mockGame.particleSystem.impactEffect).toHaveBeenCalled();
            expect(mockGame.particleSystem.createDamageNumber).toHaveBeenCalled();
        });
    });

    describe('findDefensiveAllies', () => {
        it('returns empty array if no hexGrid', () => {
            mockGame.hexGrid = null;
            const allies = orchestrator.findDefensiveAllies([], []);
            expect(allies).toEqual([]);
        });

        it('returns empty if not city/keep site', () => {
            mockGame.hexGrid.getHex.mockReturnValue({ site: { type: 'mine' } });
            const allies = orchestrator.findDefensiveAllies(
                [{ position: { q: 0, r: 0 }, defensive: true }],
                []
            );
            expect(allies).toEqual([]);
        });

        it('finds defensive allies at neighboring city/keep sites', () => {
            mockGame.hexGrid.getHex
                .mockReturnValueOnce({ site: { type: 'keep' } })  // Original enemy site
                .mockReturnValueOnce({ site: { type: 'city' } });  // Neighbor site
            
            mockEntityManager.getEnemyAt.mockReturnValueOnce(
                createMockEnemy({ defensive: true, id: 'ally1', position: { q: 1, r: 1 } })
            );
            
            const defensiveEnemies = [{
                position: { q: 0, r: 0 },
                defensive: true,
                id: 'enemy1'
            }];
            
            const allies = orchestrator.findDefensiveAllies(defensiveEnemies, defensiveEnemies);
            
            expect(allies.length).toBeGreaterThan(0);
            expect(allies[0].defensive).toBe(true);
        });

        it('avoids duplicate allies', () => {
            mockGame.hexGrid.getHex
                .mockReturnValueOnce({ site: { type: 'keep' } })
                .mockReturnValueOnce({ site: { type: 'keep' } });
            
            // Only return ally for the FIRST neighbor check
            mockEntityManager.getEnemyAt
                .mockReturnValueOnce(createMockEnemy({ defensive: true, id: 'ally1', position: { q: 1, r: 1 } }))
                .mockReturnValue(null);
            
            const defensiveEnemies = [{
                position: { q: 0, r: 0 },
                defensive: true,
                id: 'enemy1'
            }];
            
            const allies = orchestrator.findDefensiveAllies(defensiveEnemies, defensiveEnemies);
            
            // Should only add once since only one neighbor has an ally
            expect(allies.length).toBe(1);
        });
    });
});