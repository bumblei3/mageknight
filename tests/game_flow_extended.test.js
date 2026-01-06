import { describe, it, expect, beforeEach } from 'vitest';
import { MageKnightGame } from '../js/game.js';
import { UI } from '../js/ui.js';
import { TouchController } from '../js/touchController.js';
import { setupGlobalMocks, createMockElement, createSpy } from './test-mocks.js';

describe('Coverage Boost v4 - Game & UI & Touch', () => {
    let game;
    let ui;
    let touchController;

    beforeEach(() => {
        setupGlobalMocks();
        document.body.innerHTML = '';

        const hand = document.createElement('div'); hand.id = 'hand-cards'; document.body.appendChild(hand);
        const combatUnits = document.createElement('div'); combatUnits.id = 'combat-units'; document.body.appendChild(combatUnits);
        const levelUpModal = document.createElement('div'); levelUpModal.id = 'level-up-modal'; document.body.appendChild(levelUpModal);
        const skillChoices = document.createElement('div'); skillChoices.id = 'skill-choices'; levelUpModal.appendChild(skillChoices);
        const cardChoices = document.createElement('div'); cardChoices.id = 'card-choices'; levelUpModal.appendChild(cardChoices);
        const confirmBtn = document.createElement('button'); confirmBtn.id = 'confirm-level-up'; levelUpModal.appendChild(confirmBtn);
        const newLevelDisplay = document.createElement('span'); newLevelDisplay.id = 'new-level-display'; levelUpModal.appendChild(newLevelDisplay);

        game = new MageKnightGame();
        ui = new UI();
        game.ui = ui;

        ui.elements.handCards = hand;
        ui.elements.combatUnits = combatUnits;
        ui.elements.levelUpModal = levelUpModal;
        ui.elements.skillChoices = skillChoices;
        ui.elements.cardChoices = cardChoices;
        ui.elements.confirmLevelUpBtn = confirmBtn;
        ui.elements.newLevelDisplay = newLevelDisplay;

        ui.tooltipManager = {
            createSiteTooltipHTML: createSpy(() => 'Site'),
            createTerrainTooltipHTML: createSpy(() => 'Terrain'),
            createEnemyTooltipHTML: createSpy(() => 'Enemy'),
            showTooltip: createSpy(),
            showEnemyTooltip: createSpy(), showTerrainTooltip: createSpy(),
            hideTooltip: createSpy(), attachToElement: createSpy()
        };

        game.addLog = createSpy('addLog');
        touchController = new TouchController(game);
    });

    describe('MageKnightGame Gaps', () => {
        it('should show site and terrain tooltips on mouse move', () => {
            game.hexGrid.pixelToAxial = () => ({ q: 1, r: 1 });
            game.hexGrid.axialToPixel = () => ({ x: 100, y: 100 });
            game.hexGrid.getHex = () => ({ revealed: true, site: { name: 'Village' } });
            game.interactionController.handleCanvasMouseMove({ clientX: 100, clientY: 100 });
            expect(game.ui.tooltipManager.showTooltip.called).toBe(true);

            game.hexGrid.getHex = () => ({ revealed: true, terrain: 'forest' });
            game.ui.tooltipManager.showTooltip.reset();
            game.interactionController.handleCanvasMouseMove({ clientX: 100, clientY: 100 });
            expect(game.ui.tooltipManager.showTooltip.called).toBe(true);
        });
    });

    describe('UI Gaps', () => {
        it('should render boss specific UI elements and enraged status', () => {
            const boss = {
                isBoss: true, name: 'Dragon', icon: '🐲', color: 'red', armor: 5, attack: 8,
                currentHealth: 50, maxHealth: 100, getHealthPercent: () => 0.5,
                getPhaseName: () => 'Fire Phase', enraged: true, fortified: true
            };
            const el = ui.renderEnemy(boss, 'block');
            expect(el.classList.contains('boss-card')).toBe(true);
            expect(el.innerHTML.includes('WÜTEND!')).toBe(true);
        });

        it('should handle unit activation and hover in combat UI', () => {
            const unit = {
                isReady: () => true, getIcon: () => '🛡️', getName: () => 'Guards',
                getAbilities: () => [{ type: 'block', text: 'Block 3' }], level: 1, armor: 2
            };
            const onActivate = createSpy();
            ui.renderUnitsInCombat([unit], 'block', onActivate);
            const unitEl = ui.elements.combatUnits.querySelector('.unit-combat-card');

            unitEl.dispatchEvent({ type: 'mouseenter' });
            unitEl.dispatchEvent({ type: 'mouseleave' });
            unitEl.click();
            expect(onActivate.called).toBe(true);
        });

        it('should handle card formatting with healing', () => {
            const effect = { healing: 2 };
            const formatted = ui.formatEffect(effect);
            expect(formatted.includes('❤️')).toBe(true);
        });

        it('should handle level up modal choices', () => {
            const choices = {
                skills: [{ name: 'Strategy', icon: '🧠', description: 'Draw' }],
                cards: [{
                    name: 'Stamina', color: 'blue', isWound: () => false,
                    basicEffect: { movement: 2 }, strongEffect: { movement: 4 }
                }]
            };
            const onConfirm = createSpy();
            ui.showLevelUpModal(2, choices, onConfirm);
            ui.elements.skillChoices.querySelector('.skill-choice').click();
            ui.elements.cardChoices.querySelector('.card-choice').click();
            ui.elements.confirmLevelUpBtn.click();
            expect(onConfirm.called).toBe(true);
        });
    });

    describe('TouchController Gaps', () => {
        it('should handle all swipe directions', () => {
            const start = { clientX: 100, clientY: 100 };
            touchController.handleTouchStart({ touches: [start], preventDefault: () => { } });
            touchController.handleSwipe(0, -100); expect(game.addLog.calledWith('Swipe hoch', 'info')).toBe(true);
            touchController.handleSwipe(0, 100); expect(game.addLog.calledWith('Swipe runter', 'info')).toBe(true);
            touchController.handleSwipe(100, 0); expect(game.addLog.calledWith('Swipe rechts', 'info')).toBe(true);
            touchController.handleSwipe(-100, 0); expect(game.addLog.calledWith('Swipe links', 'info')).toBe(true);
        });

        it('should show tooltips for enemies and terrain on touch move', () => {
            const touch = { clientX: 100, clientY: 100 };
            game.canvas.getBoundingClientRect = () => ({ left: 0, top: 0 });
            game.hexGrid.pixelToAxial = () => ({ q: 1, r: 1 });
            game.hexGrid.hasHex = () => true;

            game.enemies = [{ position: { q: 1, r: 1 }, name: 'Orc' }];
            touchController.handleTouchMove({ touches: [touch], preventDefault: () => { } });
            expect(ui.tooltipManager.showEnemyTooltip.called).toBe(true);

            game.enemies = [];
            game.hexGrid.getHex = () => ({ terrain: 'mountain' });
            touchController.handleTouchMove({ touches: [touch], preventDefault: () => { } });
            expect(ui.tooltipManager.showTerrainTooltip.called).toBe(true);
        });

        it('should handle card long press', () => {
            game.hero.hand = [{ name: 'Strike' }];
            game.handleCardRightClick = createSpy();
            touchController.handleCardLongPress(0);
            expect(game.handleCardRightClick.called).toBe(true);
        });

        it('should handle touch cancel', () => {
            touchController.longPressTimer = setTimeout(() => { }, 1000);
            touchController.isLongPress = true;
            touchController.handleTouchCancel({});
            expect(touchController.longPressTimer).toBeNull();
            expect(touchController.isLongPress).toBe(false);
        });
    });
});
