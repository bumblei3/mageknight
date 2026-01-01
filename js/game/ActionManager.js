/**
 * Manages hero actions: Movement, Exploration, and Site Interactions.
 */
// ActionManager.js
import { eventBus } from '../eventBus.js';
import { GAME_EVENTS } from '../constants.js';

export class ActionManager {
    constructor(game) {
        this.game = game;
    }

    /**
     * Enters movement mode
     */
    enterMovementMode() {
        if (this.game.gameState !== 'playing' || this.game.combat) return;
        this.game.movementMode = true;
        this.calculateReachableHexes();
        this.game.updatePhaseIndicator();
    }

    /**
     * Exits movement mode
     */
    exitMovementMode() {
        this.game.movementMode = false;
        this.game.hexGrid.clearSelection();
        this.game.updatePhaseIndicator();
    }

    /**
     * Calculates which hexes the hero can reach
     */
    calculateReachableHexes() {
        if (!this.game.hero) return;

        const reachable = this.game.hexGrid.getReachableHexes(
            this.game.hero.position,
            this.game.hero.movementPoints,
            this.game.timeManager.isDay()
        );

        this.game.reachableHexes = reachable; // Fix: Store for UI/Tests
        this.game.hexGrid.highlightHexes(reachable);
    }

    /**
     * Moves the hero to a target hex
     */
    async moveHero(q, r) {
        if (!this.game.movementMode || this.game.gameState !== 'playing') return;

        // Distance check: Hero must move to an ADJACENT hex
        const distance = this.game.hexGrid.distance(
            this.game.hero.position.q,
            this.game.hero.position.r,
            q, r
        );

        if (distance !== 1) {
            this.game.showToast('Du kannst dich nur auf angrenzende Felder bewegen!', 'warning');
            return;
        }

        const cost = this.game.hexGrid.getMovementCost(
            q, r,
            !this.game.timeManager.isDay()
        );

        if (this.game.hero.movementPoints < cost) {
            this.game.showToast('Nicht genug Bewegungspunkte!', 'warning');
            return;
        }

        // Perform move
        const oldPos = { ...this.game.hero.position };
        this.game.hero.position = { q, r };
        this.game.hero.movementPoints -= cost;

        // Animation
        await this.game.animator.animateHeroMove(
            oldPos,
            { q, r },
            this.game.hexGrid.getScreenPos(q, r)
        );

        // Sync display position (critical for rendering)
        this.game.hero.displayPosition = { q, r };

        this.game.statisticsManager.increment('tilesExplored');
        this.game.checkAndShowAchievements();

        // Emit event for other systems
        eventBus.emit(GAME_EVENTS.HERO_MOVED, { from: oldPos, to: { q, r }, cost });

        // Phase Indicator and UI updates
        this.game.updateStats();

        // Check for enemies at new position
        const enemy = this.game.enemies.find(e => !e.isDefeated() && e.position.q === q && e.position.r === r);
        if (enemy) {
            this.game.initiateCombat(enemy);
            this.exitMovementMode();
            this.game.render();
            return;
        }

        // Check for interactions at the new position
        this.game.visitSite();

        // Continue movement mode if hero still has points and not in combat
        if (this.game.hero.movementPoints > 0 && !this.game.combat) {
            this.calculateReachableHexes(); // Update highlights for next step
        } else {
            this.exitMovementMode();
        }

        this.game.render();
    }

    /**
     * Explores adjacent unknown hexes
     */
    explore() {
        if (this.game.gameState !== 'playing' || this.game.combat) return;

        const cost = this.game.timeManager.isDay() ? 2 : 3;
        if (this.game.hero.movementPoints < cost) {
            this.game.showToast('Nicht genug Bewegungspunkte zum Erkunden!', 'warning');
            return;
        }

        const newHexes = this.game.hexGrid.exploreAdjacent(this.game.hero.position);
        if (newHexes.length > 0) {
            this.game.hero.movementPoints -= cost;
            this.game.addLog(`${newHexes.length} neue Gebiete entdeckt!`, 'discovery');
            this.game.statisticsManager.increment('tilesExplored', newHexes.length);

            // Spawn enemies in new areas
            this.game.entityManager.createEnemies();

            this.game.updateStats();
            this.game.render();
        } else {
            this.game.showToast('Hier gibt es nichts mehr zu entdecken.', 'info');
        }
    }

    /**
     * Interaction with the current site
     */
    visitSite() {
        if (this.game.combat) return;

        const currentHex = this.game.hexGrid.getHex(this.game.hero.position.q, this.game.hero.position.r);
        if (!currentHex || !currentHex.site) return;

        const site = currentHex.site;
        this.game.addLog(`Besuche ${site.getName()}...`, 'info');

        // Get interaction data from manager
        const interactionData = this.game.siteManager.visitSite(currentHex, site);

        // Show UI
        this.game.ui.showSiteModal(interactionData);
    }
}
