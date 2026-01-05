
import { describe, it, expect, beforeEach } from './testRunner.js';
import { CombatOrchestrator } from '../js/game/CombatOrchestrator.js';
import { RewardManager } from '../js/game/RewardManager.js';

// Mocks
class MockGame {
    constructor() {
        this.logs = [];
        this.gameState = 'playing';
        this.hero = {
            gainFame: () => ({ leveledUp: false }),
            healWound: () => true,
            position: { q: 0, r: 0 }
        };
        this.entityManager = { removeEnemy: () => { } };
        this.statisticsManager = { increment: () => { } };
        this.levelUpManager = { handleLevelUp: () => { } };
        this.ui = {
            hideCombatPanel: () => { },
            renderUnitsInCombat: () => { },
            updateCombatInfo: () => { },
            updateCombatTotals: () => { }
        };
        this.updateStats = () => { };
        this.updatePhaseIndicator = () => { };
        this.render = () => { };
        this.checkAndShowAchievements = () => { };
        this.hexGrid = { axialToPixel: () => ({ x: 0, y: 0 }) };
        this.particleSystem = { buffEffect: () => { } };

        this.siteManager = { currentSite: null };
        this.rewardManager = {
            showArtifactChoice: () => { this.rewardManager.artifactCalled = true; },
            showSpellChoice: () => { this.rewardManager.spellCalled = true; },
            artifactCalled: false,
            spellCalled: false
        };
    }

    addLog(msg, type) { this.logs.push(msg); }
}

describe('Location Rewards Integration', () => {
    let orchestrator;
    let game;

    beforeEach(() => {
        game = new MockGame();
        orchestrator = new CombatOrchestrator(game);
    });

    it('should trigger Artifact Choice for Dungeon', () => {
        game.siteManager.currentSite = { type: 'dungeon', conquered: false, getName: () => 'Dungeon' };
        orchestrator.onCombatEnd({ victory: true, enemy: { name: 'Monster', fame: 5 } });

        expect(game.rewardManager.artifactCalled).toBe(true);
        expect(game.siteManager.currentSite.conquered).toBe(true);
    });

    it('should trigger Spell Choice for Tomb', () => {
        game.siteManager.currentSite = { type: 'tomb', conquered: false, getName: () => 'Tomb' };
        orchestrator.onCombatEnd({ victory: true, enemy: { name: 'Vampire', fame: 5 } });

        expect(game.rewardManager.spellCalled).toBe(true);
        expect(game.siteManager.currentSite.conquered).toBe(true);
    });

    it('should trigger Heal for Spawning Grounds', () => {
        game.siteManager.currentSite = { type: 'spawning_grounds', conquered: false, getName: () => 'Spawning Grounds' };
        orchestrator.onCombatEnd({ victory: true, enemy: { name: 'Spider', fame: 5 } });

        const healLog = game.logs.find(l => l.includes('heilt eine Wunde'));
        expect(healLog).toBeTruthy();
        expect(game.siteManager.currentSite.conquered).toBe(true);
        expect(game.rewardManager.artifactCalled).toBe(false);
        expect(game.rewardManager.spellCalled).toBe(false);
    });
});
