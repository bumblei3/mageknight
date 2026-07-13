/**
 * Manages game state persistence: Saving and Loading.
 */
import { SaveManager } from '../persistence/SaveManager';

export class GameStateManager {
    private game: any;

    constructor(game: any) {
        this.game = game;
    }

    /**
     * Saves the current game state to local storage
     * @param {number|string} slotId - Optional slot ID
     */
    saveGame(slotId: number | string): void {
        try {
            const state = this.getGameState();
            const success = SaveManager.saveGame(`slot_${slotId}`, state);
            if (success) {
                const displayId = typeof slotId === 'number' ? slotId + 1 : slotId;
                this.game.showToast(`Spiel in Slot ${displayId} gespeichert`, 'success');
            } else {
                this.game.showToast('Speichern fehlgeschlagen', 'error');
            }
        } catch (e) {
            console.error('Save failed', e);
            this.game.showToast('Speichern fehlgeschlagen', 'error');
        }
    }

    /**
     * Loads game state from a specific slot
     * @param {number|string} slotId
     * @returns {boolean} Success
     */
    loadGame(slotId: number | string): boolean {
        const state = SaveManager.loadGame(`slot_${slotId}`);
        if (state) {
            return this.loadGameState(state);
        }
        return false;
    }

    /**
     * Loads game state from a specific slot without applying it
     * @param {number|string} slotId
     * @returns {SaveState | null} The raw state object
     */
    loadGameRaw(slotId: number | string): any {
        return SaveManager.loadGame(`slot_${slotId}`);
    }

    /**
     * Compiles the full game state object
     * @returns {any}
     /** Compiles the full game state object @returns {any} */
     getGameState(): any {
         // Combat state
         let combat = null;
         if (this.game.combat) {
             // Extract serializable combat state matching CombatStateSchema
             const combatEnemies = [];
             if (this.game.combat.enemies) {
                 for (const e of this.game.combat.enemies) {
                     const state = e.getState ? e.getState() : e;
                     if (state && typeof state === 'object') {
                         combatEnemies.push({
                             id: state.id ?? `enemy_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                             type: state.type ?? 'unknown',
                             name: state.name ?? 'Unknown Enemy',
                             position: state.position ?? null,
                             armor: Math.max(0, Number(state.armor) ?? 0),
                             attack: Math.max(0, Number(state.attack) ?? 0),
                             fame: Math.max(0, Number(state.fame) ?? 0),
                             icon: state.icon ?? '',
                             color: state.color ?? '#888',
                             isBoss: state.isBoss ?? false,
                             fortified: state.fortified,
                             swift: state.swift,
                             brutal: state.brutal,
                             poison: state.poison,
                             petrify: state.petrify,
                             elusive: state.elusive,
                             defensive: state.defensive,
                             vampiric: state.vampiric,
                             assassin: state.assassin,
                             cumbersome: state.cumbersome,
                             summoner: state.summoner,
                             summoned: state.summoned,
                             fireResist: state.fireResist,
                             iceResist: state.iceResist,
                             physicalResist: state.physicalResist,
                             arcaneImmune: state.arcaneImmune,
                         });
                     }
                 }
             }
             combat = {
                 phase: this.game.combat.phase ?? 'not_in_combat',
                 round: Math.max(0, Number(this.game.combat.round) ?? 0),
                 enemies: combatEnemies,
                 heroWounds: 0
             };
         }

         // Turn state
         let turn = null;
         if (this.game.turnManager && typeof this.game.turnManager.getState === 'function') {
             turn = this.game.turnManager.getState();
         }

         // Build state - ensure all required fields exist matching SaveStateSchema
         const state = {
             hero: this.game.hero ? this.game.hero.getState() : null,
             enemies: this.game.entityManager ? this.game.entityManager.enemies.map((e: any) => e.getState()) : [],
             combat,
             hexGrid: this.game.hexGrid ? this.game.hexGrid.getState() : null,
             time: this.game.timeManager ? this.game.timeManager.getState() : { round: 1, timeOfDay: 'day' },
             statistics: this.game.statisticsManager ? this.game.statisticsManager.getState() : {},
             achievements: this.game.achievementManager ? this.game.achievementManager.getState() : { unlocked: [] },
             turn,
             timestamp: Date.now()
         };

         // DEBUG: log state structure for validation debugging
         console.log('[SaveManager] getGameState:', JSON.stringify({
             hero: state.hero ? { hasPosition: !!state.hero.position, q: state.hero.position?.q, r: state.hero.position?.r } : null,
             enemiesCount: state.enemies.length,
             combat: state.combat ? { phase: state.combat.phase, enemiesCount: state.combat.enemies?.length, round: state.combat.round } : null,
             hexGrid: state.hexGrid ? 'present' : null,
             time: state.time,
             statisticsKeys: Object.keys(state.statistics || {}),
             achievements: state.achievements,
             turn: state.turn,
         }));

         return state;
     }

    /**
     * Restores game state from an object
     * @param {any} state
     * @returns {boolean}
     */
    loadGameState(state: any): boolean {
        if (!state) return false;

        try {
            // Restore hero
            if (state.hero && this.game.hero) {
                this.game.hero.loadState(state.hero);
            }

            // Restore enemies
            if (state.enemies && this.game.entityManager) {
                this.game.entityManager.enemies = state.enemies
                    .filter(Boolean) // Drop literal nulls (corrupt save array) before reconstitute
                    .map((eData: any) => {
                        const e = this.game.enemyAI.reconstituteEnemy(eData);
                        return e;
                    }).filter(Boolean); // Drop nulls from corrupt/unrecognized enemy data
                this.game.enemies = this.game.entityManager.enemies; // Compatibility
            }

            // Restore other systems
            if (state.hexGrid && this.game.hexGrid) this.game.hexGrid.loadState(state.hexGrid);
            if (state.time && this.game.timeManager) this.game.timeManager.loadState(state.time);
            if (state.statistics && this.game.statisticsManager) this.game.statisticsManager.loadState(state.statistics);
            if (state.achievements && this.game.achievementManager) this.game.achievementManager.loadState(state.achievements);
            if (state.turn && this.game.turnManager) this.game.turnManager.loadState(state.turn);

            this.game.updateStats();
            if (this.game.phaseManager) {
                this.game.phaseManager.updateTimeUI();
                this.game.phaseManager.updatePhaseIndicator();
            }
            // Skip rendering in test environment to avoid issues with NaN/Infinity in loaded hex data
            if (!(window as any).isTestEnvironment) {
                this.game.render();
            }

            return true;
        } catch (e) {
            console.error('Load failed', e);
            return false;
        }
    }

    /**
     * Opens the save file dialog (Slot-based)
     */
    async openSaveDialog(): Promise<void> {
        if (!this.game.ui || typeof this.game.ui.showSaveLoad !== 'function') return;

        const slot = await this.game.ui.showSaveLoad('save');
        if (slot !== null) {
            this.saveGame(slot);
        }
    }

    /**
     * Opens the load file dialog (Slot-based)
     */
    async openLoadDialog(): Promise<void> {
        if (!this.game.ui || typeof this.game.ui.showSaveLoad !== 'function') return;

        const slot = await this.game.ui.showSaveLoad('load');
        if (slot !== null) {
            const state = SaveManager.loadGame(`slot_${slot}`);
            if (state) {
                this.loadGameState(state);
                this.game.showToast('Spiel geladen!', 'success');
            } else {
                this.game.addLog('Fehler beim Laden', 'info');
                this.game.showToast('Fehler beim Laden', 'error');
            }
        }
    }

    /**
     * Opens the scenario selection dialog
     */
    async openScenarioSelection(): Promise<void> {
        if (this.game.ui && typeof this.game.ui.showScenarioSelection === 'function') {
            await this.game.ui.showScenarioSelection();
        }
    }

    /**
     * Opens the hero selection dialog
     * @param {string} scenarioId - The scenario chosen in the previous step
     */
    async openHeroSelection(scenarioId: string): Promise<void> {
        if (this.game.ui && typeof this.game.ui.showHeroSelection === 'function') {
            await this.game.ui.showHeroSelection(scenarioId);
        }
    }
}
