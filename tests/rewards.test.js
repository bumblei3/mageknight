import { describe, it, expect, beforeEach } from './testRunner.js';
import { createSpy } from './test-mocks.js';
import { Hero } from '../js/hero.js';
import { MageKnightGame } from '../js/game.js';
import { CombatOrchestrator } from '../js/game/CombatOrchestrator.js';
import { SiteInteractionManager } from '../js/siteInteraction.js';
import { SITE_TYPES, Site } from '../js/sites.js';
import { RewardManager } from '../js/game/RewardManager.js';
import { Card } from '../js/card.js';

describe('Reward System & Ruins', () => {
    let game;
    let hero;
    let siteInteraction;
    let combatOrchestrator;

    beforeEach(() => {
        // Mock DOM
        document.body.innerHTML = `
            <div id="game-board"></div>
            <div id="reward-modal" class="modal">
                <div id="reward-choices"></div>
            </div>
            <div id="game-log"></div>
            <div id="fame-value">0</div>
            <div id="movement-points">0</div>
            <div id="hero-armor">2</div>
            <div id="hero-handlimit">5</div>
            <div id="hero-wounds">0</div>
            <div id="mana-source-container"></div>
            <div id="play-area"></div>
            <div id="played-cards-area"></div>
        `;

        game = new MageKnightGame();
        hero = new Hero('Goldyx');
        game.hero = hero;

        // Mock essential game methods
        game.addLog = createSpy();
        game.updateStats = createSpy();
        game.render = createSpy();
        game.particleSystem = { buffEffect: createSpy() };
        game.initiateCombat = createSpy();

        game.rewardManager = new RewardManager(game);
        // Mock showArtifactChoice to avoid UI dependency issues during test if called
        game.rewardManager.showArtifactChoice = createSpy();

        siteInteraction = new SiteInteractionManager(game);
        game.siteManager = siteInteraction;
        combatOrchestrator = game.combatOrchestrator;
    });

    it('Ruin site information is correctly defined', () => {
        const ruinSite = new Site(SITE_TYPES.RUIN);
        const info = ruinSite.getInfo();
        expect(info.name).toBe('Ruine');
        expect(info.actions).toContain('explore');
    });

    it('Explore Ruin initiates combat with correct enemies', () => {
        const ruinSite = new Site(SITE_TYPES.RUIN);
        siteInteraction.currentSite = ruinSite;

        siteInteraction.exploreRuin();

        expect(game.initiateCombat.called).toBe(true);
        const enemy = game.initiateCombat.calls[0][0];
        // Check if enemy name is one of the allowed types
        const allowedNames = ['Ruinen-Beschwörer', 'Ruinen-Wächter'];
        expect(allowedNames.includes(enemy.name)).toBe(true);
    });

    it('Defeating Dungeon enemy triggers reward selection', () => {
        const dungeonSite = new Site(SITE_TYPES.DUNGEON);
        siteInteraction.currentSite = dungeonSite;

        // Mock a successful combat end
        combatOrchestrator.onCombatEnd(true);

        expect(dungeonSite.conquered).toBe(true);
        expect(game.rewardManager.showArtifactChoice.called).toBe(true);
    });

    it('Defeating Ruin enemy triggers reward selection', () => {
        const ruinSite = new Site(SITE_TYPES.RUIN);
        siteInteraction.currentSite = ruinSite;

        combatOrchestrator.onCombatEnd(true);

        expect(ruinSite.conquered).toBe(true);
        expect(game.rewardManager.showArtifactChoice.called).toBe(true);
    });

    it('Selecting artifact adds it to deck', () => {
        // We need a fresh RewardManager for this test OR restore the spied method?
        // Actually we are testing selectArtifact, which is NOT spied on.
        // But we need to make sure we don't need UI interaction that fails.
        const initialDeckSize = hero.deck.length;
        const mockArtifact = { id: 'test_art', name: 'Test Artifact', description: 'desc', color: 'gold', type: 'artifact' };

        game.rewardManager.artifactsOffer = [mockArtifact];

        // Mock document.getElementById to return something for modal close
        const modal = document.getElementById('reward-modal');
        modal.style.display = 'block';

        game.rewardManager.selectArtifact(new Card(mockArtifact));

        expect(hero.deck.length).toBe(initialDeckSize + 1);
        expect(hero.deck[0].name).toBe('Test Artifact');
        expect(game.addLog.called).toBe(true);
    });
});
