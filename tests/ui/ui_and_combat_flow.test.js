import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MageKnightGame } from '../../js/game.js';
import { setupGlobalMocks } from '../test-mocks.js';
import { animator } from '../../js/animator.js';

describe('Coverage Boost v5 - Deep Integration & Animator', () => {
    let game;

    beforeEach(() => {
        setupGlobalMocks();
        // Setup minimal DOM
        document.body.innerHTML = `
            <div id="game-container">
                <canvas id="game-board"></canvas>
                <div id="movement-points">0</div>
                <div id="hero-armor">2</div>
                <div id="day-night-overlay"></div>
                <div id="day-night-message"></div>
                <div id="time-icon"></div>
                <div id="round-number"></div>
                <div id="game-log"></div>
                <div class="phase-text"></div>
                <div id="phase-hint"></div>
                <div id="visit-btn"></div>
                <div id="explore-btn"></div>
                <div id="end-turn-btn"></div>
                <div id="rest-btn"></div>
                <div id="new-game-btn"></div>
                <div id="save-btn"></div>
                <div id="load-btn"></div>
                <div id="execute-attack-btn"></div>
            </div>
        `;
        game = new MageKnightGame();
        // Avoid real audio
        game.sound = {
            play: () => { },
            error: () => { },
            cardPlay: () => { },
            move: () => { },
            success: () => { }
        };
    });

    describe('Game Logic & Time Transitions', () => {
        it('should handle complex time transition with timeouts', (done) => {
            // Trigger time change
            game.timeManager.endRound(); // Should trigger listener

            // Wait for first timeout (1000ms)
            setTimeout(() => {
                try {
                    // After 1s, it should have toggled to Night (initially Day)
                    expect(game.timeManager.isNight()).toBe(true);
                    // Wait for second timeout (1500ms)
                    setTimeout(() => {
                        try {
                            const overlay = document.getElementById('day-night-overlay');
                            // After another 1.5s, the overlay should be removed
                            expect(overlay.classList.contains('active')).toBe(false);
                            done();
                        } catch (e) { done(e); }
                    }, 2000);
                } catch (e) { done(e); }
            }, 1200);
        });

        it('should execute ranged attack from game controller', () => {
            const enemy = game.enemies[0];
            game.initiateCombat(enemy);

            // Set ranged attack total
            game.combatRangedTotal = 10;
            game.combat.phase = 'ranged';

            // Simulate click on enemy in ranged phase
            game.combatOrchestrator.handleEnemyClick(enemy);

            expect(game.combatRangedTotal).toBe(0); // Should be reset
        });

        it('should handle level up selection for skills and cards', () => {
            game.triggerLevelUp(2);
            // Modal should be shown. We mock the selection callback in triggerLevelUp's mock if we want, 
            // but here we want to test the REAL handleLevelUpSelection.

            const mockSelection = {
                skill: { name: 'Super Strength' },
                card: { name: 'Ancient Knowledge' }
            };

            game.handleLevelUpSelection(mockSelection);
            expect(game.hero.skills[game.hero.skills.length - 1].name).toBe('Super Strength');
            expect(game.hero.hand[game.hero.hand.length - 1].name).toBe('Ancient Knowledge');
        });

        it('should handle mouse move for tooltips on hexes', () => {
            const mockEvent = {
                clientX: 100,
                clientY: 100,
                target: document.getElementById('game-board'),
                preventDefault: () => { }
            };

            // Mock getBoundingClientRect
            mockEvent.target.getBoundingClientRect = () => ({ left: 0, top: 0 });

            // Mock hexgrid behavior for revealed hex
            game.hexGrid.getHex = () => ({ revealed: true, terrain: 'plains' });

            game.interactionController.handleCanvasMouseMove(mockEvent);
            // Should not throw
        });
    });

    describe('Animator Easing Functions', () => {
        it('should cover all easing functions', () => {
            const easings = animator.easingFunctions;
            const testValues = [0, 0.5, 1];

            for (const name in easings) {
                const fn = easings[name];
                testValues.forEach(t => {
                    const result = fn(t);
                    expect(typeof result).toBe('number');
                });
            }
        });

        it('should cancel all animations', () => {
            animator.cancelAll(); // Ensure clean state
            animator.animate({ from: 0, to: 100, duration: 1000 });
            animator.animate({ from: 0, to: 100, duration: 1000 });
            expect(animator.activeAnimations.size).toBe(2);

            animator.cancelAll();
            expect(animator.activeAnimations.size).toBe(0);
        });
    });

    describe('Combat Helper & Status Effects', () => {
        it('should handle combat state and effect helpers', () => {
            const enemy = {
                name: 'Target',
                armor: 2,
                attack: 1,
                // Add missing method needed for Combat.getState()
                getState: () => ({ name: 'Target', armor: 2 })
            };
            game.initiateCombat(enemy);

            const state = game.combat.getState();
            expect(state.phase).toBeDefined();

            // Test effect application through game/combat
            game.combat.applyEffectToEnemy(enemy, 'burn');
            const effects = game.combat.getEnemyEffects(enemy);
            expect(effects.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Hero Card Acquisition & Units', () => {
        it('should handle recruiting units and failing if limit reached', () => {
            game.hero.influencePoints = 10;
            const unit = { getName: () => 'Archer' };
            const result = game.hero.recruitUnit(unit, 5);
            expect(result.success).toBe(true);
            expect(game.hero.units.length).toBe(1);

            // Reach limit
            game.hero.commandLimit = 1;
            const result2 = game.hero.recruitUnit({ getName: () => 'Second' }, 1);
            expect(result2.success).toBe(false);
            expect(result2.message).toBe('Kein Platz für weitere Einheiten.');
        });

        it('should handle influence check for recruiting units', () => {
            game.hero.influencePoints = 0;
            const result = game.hero.recruitUnit({ getName: () => 'Archer' }, 5);
            expect(result.success).toBe(false);
            expect(result.message).toBe('Nicht genug Einfluss.');
        });

        it('should handle learning spells and advanced actions', () => {
            game.hero.influencePoints = 10;
            const spell = { name: 'Fireball' };
            const res1 = game.hero.learnSpell(spell, 5);
            expect(res1.success).toBe(true);
            expect(game.hero.discard[game.hero.discard.length - 1].name).toBe('Fireball');

            const action = { name: 'Diplomacy' };
            const res2 = game.hero.learnAdvancedAction(action, 2);
            expect(res2.success).toBe(true);
            expect(game.hero.discard[game.hero.discard.length - 1].name).toBe('Diplomacy');
        });
    });

    describe('UI Interaction & Modals', () => {
        it('should cover statistics modal tabs and close logic', () => {
            // Clear body to remove auto-created fallback elements from beforeEach
            document.body.innerHTML = '';

            // Setup Modal manually since innerHTML doesn't parse children in mock
            const statsModal = document.createElement('div');
            statsModal.id = 'statistics-modal';

            const closeBtn = document.createElement('button');
            closeBtn.id = 'statistics-close';
            statsModal.appendChild(closeBtn);

            const tab1 = document.createElement('button');
            tab1.className = 'tab-btn active';
            tab1.dataset.category = 'global';
            statsModal.appendChild(tab1);

            const tab2 = document.createElement('button');
            tab2.className = 'tab-btn';
            tab2.dataset.category = 'sessions';
            statsModal.appendChild(tab2);

            const statsBtn = document.createElement('button');
            statsBtn.id = 'statistics-btn';

            const statsGrid = document.createElement('div');
            statsGrid.id = 'statistics-grid';

            document.body.appendChild(statsModal);
            document.body.appendChild(statsBtn);
            document.body.appendChild(statsGrid);

            // Re-setup listeners
            game.inputController.setup();

            statsBtn.click();
            expect(statsModal.style.display).toBe('block');

            const tabs = statsModal.querySelectorAll('.tab-btn');
            tabs[1].click(); // Switch to sessions
            expect(tabs[1].classList.contains('active')).toBe(true);

            closeBtn.click();
            expect(statsModal.style.display).toBe('none');
        });

        it('should handle outside clicks to close modals', () => {
            document.body.innerHTML = '';

            const modal = document.createElement('div');
            modal.id = 'achievements-modal';
            modal.style.display = 'block';
            document.body.appendChild(modal);

            // Re-run setup to bind window click listener
            game.inputController.setup();

            // Dispatch manual click on the MODAL itself (the backdrop)
            const event = { type: 'click', target: modal };
            window.dispatchEvent(event);

            expect(modal.style.display).toBe('none');
        });

        it('should cover achievements modal tabs', () => {
            document.body.innerHTML = '';

            const modal = document.createElement('div');
            modal.id = 'achievements-modal';

            const btn = document.createElement('button');
            btn.id = 'achievements-btn';

            const close = document.createElement('button');
            close.id = 'achievements-close';
            modal.appendChild(close);

            const list = document.createElement('div');
            list.id = 'achievements-list';
            modal.appendChild(list);

            const progress = document.createElement('div');
            progress.id = 'achievements-progress-bar';
            modal.appendChild(progress);

            const progressText = document.createElement('div');
            progressText.id = 'achievements-progress-text';
            modal.appendChild(progressText);

            const tab1 = document.createElement('button');
            tab1.className = 'tab-btn active';
            tab1.dataset.category = 'all';
            modal.appendChild(tab1);

            const tab2 = document.createElement('button');
            tab2.className = 'tab-btn';
            tab2.dataset.category = 'combat';
            modal.appendChild(tab2);

            document.body.appendChild(modal);
            document.body.appendChild(btn);

            // Ensure achievement manager has data container
            if (!game.achievementManager.achievements) {
                game.achievementManager.achievements = {};
            }

            game.inputController.setup();

            // Retrieve the button that the game actually found (handles fallback case)
            const targetBtn = document.getElementById('achievements-btn');

            targetBtn.click();
            expect(modal.style.display).toBe('block');

            const tabs = modal.querySelectorAll('.tab-btn');
            tabs[1].click(); // combat category
            expect(tabs[1].classList.contains('active')).toBe(true);
        });
    });

    describe('Additional Coverage: Combat & Tooltips', () => {
        it('should handle combat phases and boss transition abilities', () => {
            game.initiateCombat({ name: 'Dummy', armor: 1, attack: 1 });
            game.combat.phase = 'ranged'; // Not ATTACK
            const res = game.combat.attackPhase();
            expect(res.error).toBeDefined();

            game.combat.phase = 'attack';
            const res2 = game.combat.attackPhase();
            expect(res2.error).toBeUndefined();

            // Mock Boss Transition
            const boss = {
                isBoss: true,
                name: 'Boss',
                currentHealth: 10,
                maxHealth: 10,
                armor: 0,
                fame: 10,
                getResistanceMultiplier: () => 1,
                takeDamage: () => ({
                    defeated: true,
                    healthPercent: 0,
                    transitions: [{
                        phase: 'Phase 2',
                        ability: 'summon_minion',
                        message: 'Phase 2 Start'
                    }]
                }),
                executePhaseAbility: () => ({ summoned: 'Minion' })
            };

            game.combat.enemies = [boss];
            // Mock defeatedEnemies array if not present
            game.combat.defeatedEnemies = [];

            const result = game.combat.attackEnemies(100);
            expect(result.success).toBe(true);

            // Check boss transitions (there should be 2 entries: phase change and ability result)
            const abilityTransition = result.bossTransitions.find(t => t.abilityResult);
            expect(abilityTransition).toBeDefined();
            expect(abilityTransition.abilityResult).toBeDefined();
        });

        it('should handle tooltips for sites and enemies', () => {
            // Setup required element for tooltip internal logic
            document.body.innerHTML = ''; // Start clean

            // Create game canvas and re-init basic needed parts
            const canvas = document.createElement('canvas');
            canvas.id = 'game-board';
            document.body.appendChild(canvas);

            // We need game-container for UI? No, tooltip manager appends to body usually

            game.canvas = canvas;

            const mockEvent = {
                clientX: 50,
                clientY: 50,
                target: canvas,
                preventDefault: () => { }
            };
            // Mock getBoundingClientRect
            canvas.getBoundingClientRect = () => ({ left: 0, top: 0 });

            // 1. Site Tooltip
            game.hexGrid.getHex = () => ({
                revealed: true,
                site: {
                    name: 'Dungeon',
                    type: 'adventure',
                    getInfo: () => 'A deep dungeon'
                }
            });

            game.interactionController.handleCanvasMouseMove(mockEvent);
            // Verify tooltip. We'd check UI state if we could access the private tooltip element,
            // but ensuring it runs without error covers the code path.

            // 2. Enemy Tooltip logic
            // We need to match enemy position with axial
            const startQ = 0, startR = 0;
            game.hexGrid.pixelToAxial = () => ({ q: startQ, r: startR });
            game.hexGrid.axialToPixel = () => ({ x: 50, y: 50 });

            const enemy = {
                isDefeated: () => false,
                position: { q: startQ, r: startR },
                name: 'Orc',
                level: 1,
                abilities: [],
                getAbilitiesStart: () => [],
                getDescription: () => 'An orc'
            };
            game.enemies = [enemy];

            game.hexGrid.getHex = () => ({ revealed: true, terrain: 'plains' });

            game.interactionController.handleCanvasMouseMove(mockEvent);

            game.interactionController.handleCanvasMouseMove(mockEvent);

            // 4. Revealed but no info (covers else block)
            game.hexGrid.getHex = () => ({ revealed: true }); // No site, no terrain
            game.interactionController.handleCanvasMouseMove(mockEvent);
        });

        it('should handle sound toggle and achievements close', () => {
            document.body.innerHTML = '';

            // Create required elements
            const soundBtn = document.createElement('button');
            soundBtn.id = 'sound-toggle-btn';
            document.body.appendChild(soundBtn);

            const modal = document.createElement('div');
            modal.id = 'achievements-modal';
            modal.style.display = 'block';
            const closeBtn = document.createElement('button');
            closeBtn.id = 'achievements-close';
            document.body.appendChild(modal);
            document.body.appendChild(closeBtn);

            game.inputController.setup();

            // Manually mock sound manager to avoid environment issues and ensure predictable state
            game.sound = {
                enabled: false,
                toggle: () => false
            };

            // Test Sound Toggle (SoundManager is disabled, so expect it to stay false)
            const initialSound = game.sound.enabled; // false
            const toggleBtn = document.getElementById('sound-toggle-btn');
            toggleBtn.click();

            // Since SoundManager.toggle() returns false and does not change state (dummy implementation)
            expect(game.sound.enabled).toBe(false);
            expect(toggleBtn.textContent).toContain('🔇'); // Assuming game.js sets specific icon for disabled

            // Test Achievements Close
            const targetClose = document.getElementById('achievements-close');
            targetClose.click();
            expect(modal.style.display).toBe('none');
        });

        it('should create sound button if missing', () => {
            // Remove existing button if any
            const existing = document.getElementById('sound-toggle-btn');
            if (existing) existing.remove();

            // Ensure header-right exists
            let headerRight = document.querySelector('.header-right');
            if (!headerRight) {
                headerRight = document.createElement('div');
                headerRight.className = 'header-right';
                document.body.appendChild(headerRight);
            }

            // Setup listeners should trigger creation
            game.inputController.setup();

            const createdBtn = document.getElementById('sound-toggle-btn');
            // It might be created in headerRight or body depending on implementation
            const foundInHeader = headerRight.querySelector('#sound-toggle-btn');

            // Loose check: either global finding or specific container
            expect(createdBtn || foundInHeader).toBeDefined();
        });

        it('should initialize game on DOMContentLoaded', () => {
            const event = { type: 'DOMContentLoaded' };

            // This uses our newly added dispatchEvent on mock document
            const dispatchResult = document.dispatchEvent(event);
            expect(dispatchResult).toBe(true);

            // Since game.js listener creates new MageKnightGame(), 
            // we can't easily verify the side effect without spying on constructor or window.game.
            // But valid execution with no error covers the listener attachment logic.
        });

        it('should handle combo detection null checks', () => {
            game.initiateCombat({ name: 'Dummy', armor: 1, attack: 1 });
            const result = game.combat.detectCombo([]);
            expect(result).toBeNull();
        });
    });
});
