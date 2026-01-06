
import { describe, it, expect, beforeEach } from 'vitest';
import { CombatOrchestrator } from '../../js/game/CombatOrchestrator.js';
import { Enemy } from '../../js/enemy.js';

describe('CombatOrchestrator Summoning', () => {
    let gameMock;
    let orchestrator;
    let logs = [];

    beforeEach(() => {
        logs = [];
        gameMock = {
            gameState: 'playing',
            combat: null,
            hero: {
                armor: 2,
                hand: []
            },
            log: (msg, type) => logs.push({ msg, type }),
            addLog: (msg, type) => logs.push({ msg, type }),
            ui: {
                showCombatPanel: () => { },
                updateCombatInfo: () => { },
                updateCombatTotals: () => { }
            },
            updateStats: () => { },
            updatePhaseIndicator: () => { },
            checkAndShowAchievements: () => { }
        };
        orchestrator = new CombatOrchestrator(gameMock);
        // Mock uiManager since it's used in initiateCombat
        orchestrator.uiManager = gameMock.ui;
    });

    it('should replace a Summoner with a different enemy', () => {
        const summoner = new Enemy({
            id: 'necromancer',
            name: 'Necromancer',
            summoner: true,
            attack: 3,
            armor: 4
        });

        // Initiate combat
        orchestrator.initiateCombat(summoner);

        // Verify combat started
        expect(gameMock.combat).toBeTruthy();
        expect(gameMock.combat.enemies.length).toBe(1);

        // The enemy in combat should be different from the summoner
        const actualEnemy = gameMock.combat.enemies[0];

        expect(actualEnemy.id).not.toBe('necromancer');
        expect(actualEnemy.name).not.toBe('Necromancer');
        expect(actualEnemy.summoner).toBeFalsy();

        // Verify log
        const hasSummonLog = logs.some(l => l.msg.includes('Necromancer') && l.type === 'warning');
        expect(hasSummonLog).toBe(true);
    });

    it('should NOT replace a non-Summoner', () => {
        const orc = new Enemy({
            id: 'orc1',
            name: 'Orc',
            summoner: false,
            attack: 2,
            armor: 3
        });

        orchestrator.initiateCombat(orc);

        expect(gameMock.combat.enemies[0].id).toBe('orc1');
        expect(gameMock.combat.enemies[0].name).toBe('Orc');
    });
});
