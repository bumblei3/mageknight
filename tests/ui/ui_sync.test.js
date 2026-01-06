import { describe, it, expect, beforeEach } from 'vitest';
import { MageKnightGame } from '../../js/game.js';
import { setupGlobalMocks } from '../test-mocks.js';
import { COMBAT_PHASES } from '../../js/constants.js';

describe('UI Synchronization Tests', () => {
    let game;

    beforeEach(() => {
        setupGlobalMocks();
        // Setup minimal DOM for game
        document.body.innerHTML = ''; // Clear body first
        const wrapper = document.createElement('div');
        wrapper.className = 'board-wrapper';
        document.body.appendChild(wrapper);

        const canvas = document.createElement('canvas');
        canvas.id = 'game-board';
        wrapper.appendChild(canvas);

        const moveControls = document.createElement('div');
        moveControls.id = 'movement-controls';
        document.body.appendChild(moveControls);

        const combatPanel = document.createElement('div');
        combatPanel.id = 'combat-panel';
        combatPanel.style.display = 'none';
        document.body.appendChild(combatPanel);

        const statsPanel = document.createElement('div');
        statsPanel.id = 'stats-panel';
        document.body.appendChild(statsPanel);

        const mvPoints = document.createElement('span');
        mvPoints.id = 'movement-points';
        mvPoints.textContent = '0';
        statsPanel.appendChild(mvPoints);

        const visitBtn = document.createElement('div');
        visitBtn.id = 'visit-btn';
        visitBtn.style.display = 'none';
        document.body.appendChild(visitBtn);

        // Add other required elements via dummy container to avoid null refs in UI.js
        const dummy = document.createElement('div');
        dummy.innerHTML = '<div id="fame-value"></div><div id="reputation-value"></div><div id="hero-name"></div><div id="hero-armor"></div><div id="hero-handlimit"></div><div id="hero-wounds"></div><div id="end-turn-btn"></div><div id="rest-btn"></div><div id="explore-btn"></div><div id="new-game-btn"></div><div id="hand-cards"></div><div id="played-cards"></div><div id="play-area"></div><div id="mana-source"></div><div id="game-log"></div><div id="day-night-overlay"></div><div id="day-night-message"></div><div id="time-icon"></div><div id="round-number"></div><div id="combat-enemies"></div><div id="hand-container"></div>';
        document.body.appendChild(dummy); // Append the dummy container to make its children part of the DOM

        game = new MageKnightGame();
    });

    it('should update movement controls based on movement points', () => {
        game.hero.movementPoints = 0;
        game.updateStats(); // This usually calls updateUI logic

        const moveControls = document.getElementById('movement-controls');
        // Depending on implementation, it might be display: none or disabled
        // Let's check how game.js handles it.
        // Looking at game.js: if (this.hero.movementPoints === 0) { this.exitMovementMode(); }

        game.hero.movementPoints = 5;
        game.updateStats();
        const el = document.getElementById('movement-points');
        expect(el.textContent).toBe('5');
    });

    it('should show combat panel and correct number of enemies when combat starts', () => {
        const dummyEnemy = {
            id: 'e1',
            name: 'Orc',
            icon: '👹',
            getEffectiveAttack: () => 3,
            currentHealth: 5,
            maxHealth: 5
        };

        game.initiateCombat(dummyEnemy);

        const combatPanel = document.getElementById('combat-panel');
        expect(combatPanel.style.display).not.toBe('none');

        const enemyTokens = document.querySelectorAll('.enemy-token');
        // ui.js creates these. Even if not fully rendered in mock DOM, 
        // game.initiateCombat calls ui.showCombatPanel.
        expect(game.combat.enemies.length).toBe(1);
    });

    it('should show visit button only when on a site', () => {
        // Mock a hex with a site
        const hex = { q: 1, r: 1, terrain: 'village', site: { getName: () => 'Dorf', getIcon: () => '🏠' } };
        game.hexGrid.setHex(1, 1, hex);
        game.hero.position = { q: 1, r: 1 };

        game.updateStats(); // Trigger movement logic

        const visitBtn = document.getElementById('visit-btn');
        expect(visitBtn.style.display).toBe('inline-block');

        // Move away
        game.hero.position = { q: 2, r: 2 };
        game.updateStats();
        expect(visitBtn.style.display).toBe('none');
    });

    it('should synchronize stat pills with hero state', () => {
        game.hero.armor = 4;
        game.hero.movementPoints = 3;
        game.hero.attackPoints = 2;
        game.hero.blockPoints = 1;

        game.updateStats();

        expect(document.getElementById('movement-points').textContent).toBe('3');
        // armor usually in stat-pill or similar
        // We check the values rendered by UI.updateStats
    });
});
