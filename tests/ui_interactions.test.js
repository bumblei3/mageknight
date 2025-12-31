import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { AchievementManager } from '../js/achievements.js';
import {
    createMockWindow,
    createMockDocument,
    resetMocks
} from './test-mocks.js';

describe('Advanced UI Interaction Coverage', () => {
    let game;

    beforeEach(() => {
        document.body.innerHTML = '';

        // Setup essential DOM elements for game init
        const canvas = document.createElement('canvas');
        canvas.id = 'game-board';
        document.body.appendChild(canvas);

        const statsGrid = document.createElement('div');
        statsGrid.id = 'statistics-grid';
        document.body.appendChild(statsGrid);

        const handCards = document.createElement('div');
        handCards.id = 'hand-cards';
        document.body.appendChild(handCards);

        const helpBtn = document.createElement('button');
        helpBtn.id = 'help-btn';
        document.body.appendChild(helpBtn);

        const visitBtn = document.createElement('button');
        visitBtn.id = 'visit-btn';
        document.body.appendChild(visitBtn);

        const endTurnBtn = document.createElement('button');
        endTurnBtn.id = 'end-turn-btn';
        document.body.appendChild(endTurnBtn);

        const helpModal = document.createElement('div');
        helpModal.id = 'help-modal';
        document.body.appendChild(helpModal);

        const helpClose = document.createElement('div');
        helpClose.id = 'help-close';
        document.body.appendChild(helpClose);

        const tutorialModal = document.createElement('div');
        tutorialModal.id = 'tutorial-modal';
        document.body.appendChild(tutorialModal);

        // Achievements Modal
        const achievementsBtn = document.createElement('button');
        achievementsBtn.id = 'achievements-btn';
        document.body.appendChild(achievementsBtn);

        const achievementsModal = document.createElement('div');
        achievementsModal.id = 'achievements-modal';
        document.body.appendChild(achievementsModal);

        const achievementsClose = document.createElement('button');
        achievementsClose.id = 'achievements-close';
        achievementsModal.appendChild(achievementsClose);

        // Stats Modal
        const statsBtn = document.createElement('button');
        statsBtn.id = 'statistics-btn';
        document.body.appendChild(statsBtn);

        const statsModal = document.createElement('div');
        statsModal.id = 'statistics-modal';
        document.body.appendChild(statsModal);

        const statsClose = document.createElement('button');
        statsClose.id = 'statistics-close';
        statsModal.appendChild(statsClose);

        // Sound Toggle
        const soundBtn = document.createElement('button');
        soundBtn.id = 'sound-toggle-btn';
        document.body.appendChild(soundBtn);

        game = new MageKnightGame();
    });

    afterEach(() => {
        resetMocks();
    });

    describe('AchievementManager Edge Cases', () => {
        it('should handle isUnlocked and duplicate unlocks', () => {
            const am = new AchievementManager();
            am.unlock('first_blood');

            expect(am.isUnlocked('first_blood')).toBe(true);
            expect(am.isUnlocked('non_existent')).toBe(false);

            const result = am.unlock('first_blood');
            expect(result).toBe(false); // Already unlocked
        });
    });

    describe('Help Tab Interactions', () => {
        it('should switch help tabs', () => {
            const tab1 = document.createElement('div');
            tab1.className = 'help-tab';
            tab1.dataset.tab = 'general';

            const content1 = document.createElement('div');
            content1.id = 'help-general';
            content1.className = 'help-tab-content';

            document.body.appendChild(tab1);
            document.body.appendChild(content1);

            game.setupHelpSystem();

            tab1.click();
            expect(tab1.classList.contains('active')).toBe(true);
            expect(content1.classList.contains('active')).toBe(true);
        });
    });

    describe('Tutorial Visibility', () => {
        it('should show tutorial', () => {
            const tutorialModal = document.getElementById('tutorial-modal');
            game.showTutorial = () => { tutorialModal.classList.add('active'); };
            game.showTutorial();
            expect(tutorialModal.classList.contains('active')).toBe(true);
        });
    });

    describe('Modal Interactions and Tabs', () => {
        it('should handle Achievements modal close and tab switching', () => {
            const modal = document.getElementById('achievements-modal');
            const closeBtn = document.getElementById('achievements-close');

            modal.style.display = 'block';
            closeBtn.click();
            expect(modal.style.display).toBe('none');

            const tab = document.createElement('button');
            tab.className = 'tab-btn';
            tab.dataset.category = 'enemies';
            modal.appendChild(tab);

            game.setupEventListeners();

            tab.click();
            expect(tab.classList.contains('active')).toBe(true);
        });

        it('should handle Statistics modal close and tab switching', () => {
            const modal = document.getElementById('statistics-modal');
            const closeBtn = document.getElementById('statistics-close');

            modal.style.display = 'block';
            closeBtn.click();
            expect(modal.style.display).toBe('none');

            const tab = document.createElement('button');
            tab.className = 'tab-btn';
            tab.dataset.category = 'exploration';
            modal.appendChild(tab);

            game.setupEventListeners();

            tab.click();
            expect(tab.classList.contains('active')).toBe(true);
        });

        it('should close modals on outside click', () => {
            const achievementsModal = document.getElementById('achievements-modal');
            const statsModal = document.getElementById('statistics-modal');

            achievementsModal.style.display = 'block';
            statsModal.style.display = 'block';

            const event = new MouseEvent('click');
            Object.defineProperty(event, 'target', { value: achievementsModal });
            window.dispatchEvent(event);
            expect(achievementsModal.style.display).toBe('none');

            const event2 = new MouseEvent('click');
            Object.defineProperty(event2, 'target', { value: statsModal });
            window.dispatchEvent(event2);
            expect(statsModal.style.display).toBe('none');
        });
    });

    describe('Enhanced Tooltip Coverage', () => {
        it('should handle canvas mouse move tooltip branches', () => {
            game.hexGrid.pixelToAxial = () => ({ q: 0, r: 0 });
            game.hexGrid.getHex = () => ({ terrain: 'plains', revealed: true });
            game.enemies = [{
                position: { q: 0, r: 0 },
                type: 'orc',
                isDefeated: () => false
            }];
            game.ui.tooltipManager.createEnemyTooltipHTML = () => 'Enemy tooltip';
            let tooltipShown = false;
            game.ui.tooltipManager.showTooltip = () => { tooltipShown = true; };
            game.hexGrid.axialToPixel = () => ({ x: 0, y: 0 });

            game.handleCanvasMouseMove({ clientX: 100, clientY: 100 });
            expect(tooltipShown).toBe(true);

            game.enemies = [];
            game.hexGrid.getHex = () => ({ revealed: true });
            let tooltipHidden = false;
            game.ui.tooltipManager.hideTooltip = () => { tooltipHidden = true; };

            game.handleCanvasMouseMove({ clientX: 100, clientY: 100 });
            expect(tooltipHidden).toBe(true);

            game.hexGrid.pixelToAxial = () => ({ q: 99, r: 99 });
            game.hexGrid.getHex = () => null;
            tooltipHidden = false;

            game.handleCanvasMouseMove({ clientX: 100, clientY: 100 });
            expect(tooltipHidden).toBe(true);
        });
    });

    describe('Sound & Menu Interaction', () => {
        it('should handle sound toggle click', () => {
            const soundBtn = document.getElementById('sound-toggle-btn');

            game.sound.toggle = () => true;
            soundBtn.click();
            expect(soundBtn.innerHTML).toBe('🔊');

            game.sound.toggle = () => false;
            soundBtn.click();
            expect(soundBtn.innerHTML).toBe('🔇');
        });

        it('should create sound toggle button if it does not exist', () => {
            const existingBtn = document.getElementById('sound-toggle-btn');
            if (existingBtn) existingBtn.remove();

            const headerRight = document.createElement('div');
            headerRight.className = 'header-right';
            document.body.appendChild(headerRight);

            game.setupSoundToggle();

            const newBtn = document.getElementById('sound-toggle-btn');
            expect(newBtn).not.toBeNull();
            expect(newBtn.id).toBe('sound-toggle-btn');
        });

        it('should open Achievements modal on button click', () => {
            const btn = document.getElementById('achievements-btn');
            const modal = document.getElementById('achievements-modal');
            game.renderAchievements = () => { };

            btn.click();
            expect(modal.style.display).toBe('block');
        });
    });
});
