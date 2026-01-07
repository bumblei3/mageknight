/**
 * Manages hero actions: Movement, Exploration, and Site Interactions.
 * Implements Undo/Redo functionality via the Command Pattern (snapshot-based).
 */
import { eventBus } from '../eventBus.js';
import { GAME_EVENTS } from '../constants.js';
import { logger } from '../logger.js';

export class ActionManager {
    constructor(game) {
        this.game = game;
        this.history = []; // Stack of { heroState, manaState, timestamp }
        this.MAX_HISTORY = 20;
    }

    /**
     * Saves the current game state to the history stack.
     * Should be called BEFORE an action is executed.
     */
    saveCheckpoint() {
        // Allow undo in combat but ONLY for safe phases/actions
        // If in combat, we must save combat state too

        logger.debug('Saving checkpoint for undo/redo');

        const checkpoint = {
            hero: this.game.hero.getState(),
            mana: this.game.manaSource.getState(),
            timestamp: Date.now()
        };

        if (this.game.combat) {
            checkpoint.combat = this.game.combat.getState();
            if (this.game.combatOrchestrator) {
                checkpoint.orchestrator = {
                    attackTotal: this.game.combatOrchestrator.combatAttackTotal,
                    blockTotal: this.game.combatOrchestrator.combatBlockTotal,
                    activeBlocks: [...this.game.combatOrchestrator.activeBlocks],
                    rangedTotal: this.game.combatOrchestrator.combatRangedTotal,
                    siegeTotal: this.game.combatOrchestrator.combatSiegeTotal
                };
            }
        }

        this.history.push(checkpoint);

        // Limit history size
        if (this.history.length > this.MAX_HISTORY) {
            this.history.shift();
        }

        this.updateUndoUI();
    }

    /**
     * Restores the last checkpoint.
     */
    undoLastAction() {
        if (this.history.length === 0) {
            this.game.showToast('Nichts zum Rückgängig machen.', 'info');
            return;
        }

        const checkpoint = this.history[this.history.length - 1]; // Peek first to check validity

        // Check if we are trying to undo a non-combat state while in combat, or vice versa
        // Actually, simpler: if checkpoint has combat data, we must be in combat (or restore it?).
        // In Mage Knight, if we leave combat (End Combat), that's usually irreversible (dice rolled etc).
        // So we probably only Undo WITHIN combat or WITHIN exploration.

        if (this.game.combat && !checkpoint.combat) {
            this.game.showToast('Kann nicht über Kampf-Grenzen hinweg rückgängig machen.', 'error');
            this.clearHistory();
            return;
        }

        this.history.pop(); // Remove it now

        // Restore State
        this.game.hero.loadState(checkpoint.hero);
        this.game.manaSource.loadState(checkpoint.mana);

        if (checkpoint.combat && this.game.combat) {
            this.game.combat.loadState(checkpoint.combat);

            if (this.game.combatOrchestrator && checkpoint.orchestrator) {
                const orch = this.game.combatOrchestrator;
                orch.combatAttackTotal = checkpoint.orchestrator.attackTotal;
                orch.combatBlockTotal = checkpoint.orchestrator.blockTotal;
                orch.activeBlocks = [...checkpoint.orchestrator.activeBlocks];
                orch.combatRangedTotal = checkpoint.orchestrator.rangedTotal;
                orch.combatSiegeTotal = checkpoint.orchestrator.siegeTotal;

                // Force UI Update
                orch.updateCombatInfo();
                orch.renderUnitsInCombat();
            }
        }

        // Visual Feedback
        this.game.addLog('Aktion rückgängig gemacht.', 'info');
        logger.info('Action undone. State restored.');
        this.game.showToast('Rückgängig gemacht', 'info');

        // Re-render EVERYTHING
        this.game.render();
        this.game.renderHand();
        this.game.renderMana();
        this.game.updateStats(); // Updates UI buttons etc.

        // If we were in movement mode, we might need to recalculate/exit
        // Best approach: If we have movement points, enter mode. Else exit.
        if (this.game.hero.movementPoints > 0 && !this.game.combat) {
            this.enterMovementMode();
        } else if (!this.game.combat) {
            this.exitMovementMode();
        }

        this.updateUndoUI();
    }

    /**
     * Clears history (called when irreversible actions happen, e.g. revealing new tiles)
     */
    clearHistory() {
        this.history = [];
        this.updateUndoUI();
    }

    updateUndoUI() {
        // Update Undo button availability if it exists
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) {
            undoBtn.disabled = this.history.length === 0;
            if (this.history.length === 0) {
                undoBtn.classList.add('disabled');
            } else {
                undoBtn.classList.remove('disabled');
            }
        }
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
            this.game.timeManager.isDay(),
            this.game.hero.hasSkill('flight')
        );

        this.game.reachableHexes = reachable;
        this.game.hexGrid.highlightHexes(reachable);
    }

    /**
     * Moves the hero to a target hex
     */
    async moveHero(q, r) {
        if (!this.game.movementMode || this.game.gameState !== 'playing') return;

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
            !this.game.timeManager.isDay(),
            this.game.hero.hasSkill('flight')
        );

        if (this.game.hero.movementPoints < cost) {
            this.game.showToast('Nicht genug Bewegungspunkte!', 'warning');
            return;
        }

        // SAVE STATE BEFORE ACTION
        this.saveCheckpoint();

        // Perform move
        const oldPos = { ...this.game.hero.position };
        this.game.hero.position = { q, r };
        this.game.hero.movementPoints -= cost;
        logger.info(`Hero moved from ${oldPos.q},${oldPos.r} to ${q},${r} (Cost: ${cost}, Points left: ${this.game.hero.movementPoints})`);

        // Animation
        await this.game.animator.animateHeroMove(
            this.game.hero,
            oldPos,
            { q, r }
        );

        // Sync display position
        this.game.hero.displayPosition = { q, r };

        this.game.statisticsManager.increment('tilesExplored');
        this.game.checkAndShowAchievements();

        eventBus.emit(GAME_EVENTS.HERO_MOVED, { from: oldPos, to: { q, r }, cost });

        // Visual Polish Override
        eventBus.emit(GAME_EVENTS.HERO_MOVE_STEP, { from: oldPos, to: { q, r } });


        this.game.updateStats();

        // Check for enemies/sites - IF TRIGGERED, CLEAR HISTORY
        const enemy = this.game.enemies.find(e => !e.isDefeated() && e.position.q === q && e.position.r === r);
        if (enemy) {
            this.clearHistory(); // Combat started, cannot undo movement
            this.game.combatOrchestrator.initiateCombat(enemy);
            this.exitMovementMode();
            this.game.render();
            return;
        }

        // Check for interactions at the new position
        // If visiting a site triggers something irreversible, visitSite should handle it
        // But merely entering a tile with a site is usually fine unless it's a "Force Visit" site (not common in MK except Keeps/Towers)
        // Actually, entering a Keep/Tower triggers forced combat usually.
        // Assuming visitSite only opens modal -> Reversible? No, entering the modal might allow actions.
        // For safety, let's keep it reversible until they ACT inside the site.
        this.visitSite();

        if (this.game.hero.movementPoints > 0 && !this.game.combat) {
            this.calculateReachableHexes();
        } else {
            this.exitMovementMode();
        }

        this.game.render();
    }

    /**
     * Explores adjacent unknown hexes
     */
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

        // Exploration reveals new info -> IRREVERSIBLE
        this.clearHistory();

        // Use MapManager to potentially place new tiles or just reveal
        const result = this.game.mapManager.explore(this.game.hero.position.q, this.game.hero.position.r);

        // Also reveal existing fog of war
        const newHexes = this.game.hexGrid.exploreAdjacent(this.game.hero.position);

        if (result.success || newHexes.length > 0) {
            this.game.hero.movementPoints -= cost;
            const count = (result.success ? 7 : 0) + newHexes.length; // Approx 7 for a new tile

            this.game.addLog('Neues Gebiet entdeckt!', 'discovery');
            this.game.statisticsManager.increment('tilesExplored', count);

            // Visual Feedback
            this.game.particleSystem.discoveryEffect(
                this.game.hexGrid.getScreenPos(this.game.hero.position.q, this.game.hero.position.r).x,
                this.game.hexGrid.getScreenPos(this.game.hero.position.q, this.game.hero.position.r).y
            );

            this.game.entityManager.createEnemies();

            // Handle World Event
            if (result.event) {
                this.game.ui.showEventModal(result.event);
            }

            this.game.updateStats();
            this.game.render();
        } else {
            this.game.showToast('Hier gibt es nichts mehr zu entdecken.', 'info');
        }
    }

    /**
     * Helper to play a card via ActionManager (centralized)
     */
    playCard(index, useStrong, isNight) {
        if (this.game.combat) {
            // Combat actions are handled by CombatOrchestrator
            // We can't easily undo mid-combat actions yet without deep Combat state saving
            this.game.combatOrchestrator.playCardInCombat(index, this.game.hero.hand[index]);
            return;
        }

        this.saveCheckpoint();

        const result = this.game.hero.playCard(index, useStrong, isNight);
        if (result) {
            // Success logic (Particles, UI)
            eventBus.emit(GAME_EVENTS.CARD_PLAYED, {});
            return result;
        } else {
            // Failed, undo the save? No, state didn't change.
            // But we pushed to stack. Pop it.
            this.history.pop();
            this.updateUndoUI();
            return null;
        }
    }

    playCardSideways(index, effectType) {
        if (this.game.combat) return null; // Logic handled in InteractionController check, but good here too

        this.saveCheckpoint();

        const result = this.game.hero.playCardSideways(index, effectType);
        if (result) {
            eventBus.emit(GAME_EVENTS.CARD_PLAYED, { sideways: true });
            return result;
        } else {
            this.history.pop();
            this.updateUndoUI();
            return null;
        }
    }

    takeMana(index, _color) {
        this.saveCheckpoint();

        const mana = this.game.manaSource.takeDie(index, this.game.timeManager.isNight());
        if (mana) {
            this.game.hero.takeManaFromSource(mana);
            return mana;
        } else {
            this.history.pop();
            this.updateUndoUI();
            return null;
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

        const interactionData = this.game.siteManager.visitSite(currentHex, site);
        this.game.ui.showSiteModal(interactionData);
    }
}
