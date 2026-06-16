import { ENEMY_TYPES, createEnemy, createBoss, EnemyType } from './enemy';
import { AIPersonality, AI_PERSONALITIES, PERSONALITY_CONFIGS, getPersonalityConfig, selectPersonalityForEnemy, applyPersonalityToEnemy } from './ai/aiPersonalities';

/**
 * Enemy AI Module
 * Handles intelligent enemy behavior, difficulty scaling, and boss mechanics
 */

export const ENEMY_ABILITIES = {
    NONE: 'none',
    POISON: 'poison', // Deals damage over time or extra wounds
    FREEZE: 'freeze', // Increases movement cost or blocks cards
    FIRE: 'fire', // Double damage
    SUMMON: 'summon', // Summons minion
    HEAL: 'heal', // Heals self
    VAMPIRIC: 'vampiric' // Heals on damage
} as const;

export type EnemyAbility = typeof ENEMY_ABILITIES[keyof typeof ENEMY_ABILITIES];

/** Enemy data extended with AI personality */
export interface EnemyWithAI {
    id: string;
    name: string;
    type: EnemyType;
    position: { q: number; r: number } | null;
    isDefeated: boolean;
    aiPersonality?: AIPersonality;
}

export class EnemyAI {
    private game: any;
    private difficulty: number = 1; // 1-10 scale
    private worker: Worker | null = null;
    private pendingResolve: ((value: string[]) => void) | null = null;

    constructor(game: any) {
        this.game = game;
        this.difficulty = 1;

        // Initialize Worker
        this.worker = null;
        this.pendingResolve = null;

        // Only initialize Worker in browser environment (not Node.js/vitest)
        // Check for browser Worker (not Node's worker_threads)
        const isBrowser = typeof window !== 'undefined' && typeof Worker !== 'undefined';
        if (isBrowser) {
            try {
                this.worker = new Worker(new URL('./workers/aiWorker.js', import.meta.url), { type: 'module' });
                this.worker.onmessage = this.handleWorkerMessage.bind(this);
                console.log('AI Worker initialized');
            } catch (e) {
                console.error('Failed to initialize AI Worker:', e);
            }
        } else {
            console.log('AI Worker skipped (non-browser environment)');
        }
    }

    private handleWorkerMessage(e: MessageEvent): void {
        const { action, payload } = e.data;
        if (action === 'movesCalculated' && this.pendingResolve) {
            const { newPositions, moveLog } = payload;

            // Apply new positions
            newPositions.forEach((p: any) => {
                const enemy = this.game.enemies.find((e: any) => e.id === p.id);
                if (enemy) {
                    enemy.position = p.position;
                }
            });

            this.pendingResolve(moveLog);
            this.pendingResolve = null;
        }
    }

    /**
     * Generate an enemy based on terrain and difficulty
     */
    public generateEnemy(terrainType: string, level: number = 1): any {
        const difficulty = Math.min(10, Math.ceil(level / 2) + this.difficulty);

        let type: string = ENEMY_TYPES.ORC;

        // Determine type based on terrain and difficulty
        if (terrainType === 'mountain' || terrainType === 'wasteland') {
            if (difficulty > 7) type = (ENEMY_TYPES as any).DRACONUM;
            else if (difficulty > 5) type = (ENEMY_TYPES as any).ELEMENTAL;
            else type = ENEMY_TYPES.ORC;
        } else if (terrainType === 'swamp' || terrainType === 'ruins') {
            if (difficulty > 6) type = (ENEMY_TYPES as any).NECROMANCER;
            else if (difficulty > 4) type = (ENEMY_TYPES as any).MAGE_TOWER;
            else type = ENEMY_TYPES.ORC;
        } else if (terrainType === 'forest') {
            if (difficulty > 3) type = (ENEMY_TYPES as any).ROBBER;
        }

        // Create base enemy
        const enemy = createEnemy(type) as any;
        if (!enemy) return createEnemy(ENEMY_TYPES.ORC); // Fallback

        // Scale stats based on difficulty
        const scalingFactor = Math.max(0, difficulty - 3);
        if (scalingFactor > 0) {
            enemy.armor += Math.floor(scalingFactor / 2);
            enemy.attack += Math.floor(scalingFactor / 2);
            enemy.fame += scalingFactor;

            // Add random abilities for high difficulty
            if (difficulty > 5 && !enemy.abilities) enemy.abilities = [];
            if (difficulty > 5 && Math.random() > 0.5) enemy.abilities.push(ENEMY_ABILITIES.POISON);
            if (difficulty > 8) enemy.abilities.push(ENEMY_ABILITIES.VAMPIRIC);
        }

        enemy.level = difficulty;
        enemy.maxHealth = enemy.armor;
        enemy.currentHealth = enemy.armor;
        enemy.abilities = enemy.abilities || [];

        // Assign AI Personality based on type and difficulty
        const personality = selectPersonalityForEnemy(type as EnemyType, difficulty);
        const config = getPersonalityConfig(personality);
        enemy.aiPersonality = personality;
        enemy.aiConfig = config;

        // Apply personality modifiers to stats
        enemy.attack = Math.round(enemy.attack * (0.8 + config.combatAggression * 0.4));
        enemy.armor = Math.round(enemy.armor * (0.9 + config.difficultyMultiplier * 0.2));
        enemy.maxHealth = enemy.armor;
        enemy.currentHealth = enemy.armor;

        // Map existing flags to abilities for AI processing
        if (enemy.poison) enemy.abilities.push(ENEMY_ABILITIES.POISON);

        return enemy;
    }

    /** Calculate enemy action for the turn */
    public decideAction(enemy: any, _heroState: any): any {
        const config = enemy.aiConfig || getPersonalityConfig(enemy.aiPersonality) || PERSONALITY_CONFIGS[AI_PERSONALITIES.BALANCED];
        const healthPercent = enemy.currentHealth / Math.max(1, enemy.maxHealth);

        // Check retreat condition
        if (healthPercent <= config.retreatThreshold && config.retreatThreshold > 0) {
            return {
                type: 'retreat',
                value: 0,
                abilities: enemy.abilities,
                message: `${enemy.name} flüchtet!`
            };
        }

        // Berserker: always all-out attack
        if (enemy.aiPersonality === AI_PERSONALITIES.BERSERKER) {
            return {
                type: 'heavy_attack',
                value: enemy.getEffectiveAttack ? enemy.getEffectiveAttack() : enemy.attack,
                element: enemy.attackType || 'physical',
                abilities: enemy.abilities,
                allOut: true,
                message: `${enemy.name} stürzt sich wütend in den Kampf!`
            };
        }

        // Cowardly: prefer ranged/avoid melee
        if (enemy.aiPersonality === AI_PERSONALITIES.COWARDLY) {
            if (enemy.abilities?.includes('summon')) {
                return {
                    type: 'summon',
                    value: 0,
                    abilities: enemy.abilities,
                    message: `${enemy.name} ruft Verstärkung!`
                };
            }
            return {
                type: 'ranged',
                value: Math.floor(enemy.attack * 0.7),
                element: enemy.attackType || 'physical',
                abilities: enemy.abilities,
                keepDistance: true,
                message: `${enemy.name} attackiert aus der Distanz!`
            };
        }

        // Defensive: hold ground, block if possible
        if (enemy.aiPersonality === AI_PERSONALITIES.DEFENSIVE || enemy.defensive) {
            if (healthPercent < 0.5 && enemy.abilities?.includes('heal')) {
                return {
                    type: 'heal',
                    value: Math.floor(enemy.maxHealth * 0.2),
                    abilities: enemy.abilities,
                    message: `${enemy.name} heilt sich!`
                };
            }
            return {
                type: 'defend',
                value: enemy.getBlockRequirement ? enemy.getBlockRequirement() : enemy.attack,
                element: enemy.attackType || 'physical',
                abilities: enemy.abilities,
                fortified: true,
                message: `${enemy.name} nimmt eine defensive Haltung ein!`
            };
        }

        // Tactical: use elemental advantages, poison, abilities
        if (enemy.aiPersonality === AI_PERSONALITIES.TACTICAL) {
            // Use poison if available and not already applied
            if (enemy.abilities?.includes('poison') && Math.random() < 0.4) {
                return {
                    type: 'poison_attack',
                    value: enemy.attack,
                    element: enemy.attackType || 'physical',
                    abilities: enemy.abilities,
                    applyPoison: true,
                    message: `${enemy.name} greift mit Gift an!`
                };
            }
            // Use elemental attack if advantageous
            if (enemy.attackType && enemy.attackType !== 'physical' && Math.random() < 0.6) {
                return {
                    type: 'elemental_attack',
                    value: enemy.getEffectiveAttack ? enemy.getEffectiveAttack() : enemy.attack,
                    element: enemy.attackType,
                    abilities: enemy.abilities,
                    message: `${enemy.name} entfesselt ${enemy.attackType}-Angriff!`
                };
            }
        }

        // Vampire: prefer attacks that heal
        if (enemy.vampiric || enemy.abilities?.includes('vampiric')) {
            if (healthPercent < 0.7 && Math.random() < 0.5) {
                return {
                    type: 'vampiric_attack',
                    value: enemy.getEffectiveAttack ? enemy.getEffectiveAttack() : enemy.attack,
                    element: enemy.attackType || 'physical',
                    abilities: enemy.abilities,
                    healOnHit: true,
                    message: `${enemy.name} stiehlt Lebenskraft!`
                };
            }
        }

        // Summoner: summon when outnumbered or low health
        if (enemy.summoner || enemy.abilities?.includes('summon')) {
            const allyCount = _heroState?.enemies?.filter((e: any) => !e.isDefeated && e !== enemy).length || 0;
            if ((allyCount < 2 || healthPercent < 0.4) && Math.random() < 0.35) {
                return {
                    type: 'summon',
                    value: 0,
                    abilities: enemy.abilities,
                    message: `${enemy.name} beschwört Diener!`
                };
            }
        }

        // Standard attack with aggression scaling
        const aggression = config.combatAggression;
        const attackValue = enemy.getEffectiveAttack ? enemy.getEffectiveAttack() : enemy.attack;

        if (aggression > 0.8 && Math.random() < 0.3) {
            // High aggression: chance for heavy attack
            return {
                type: 'heavy_attack',
                value: attackValue,
                element: enemy.attackType || 'physical',
                abilities: enemy.abilities,
                message: `${enemy.name} führt einen schweren Angriff aus!`
            };
        }

        // Normal attack
        return {
            type: 'attack',
            value: attackValue,
            element: enemy.attackType || 'physical',
            abilities: enemy.abilities,
            message: `${enemy.name} greift an!`
        };
    }

    /**
     * Apply ability effects
     */
    public applyAbility(ability: EnemyAbility, target: any, source: any): any {
        switch (ability) {
            case ENEMY_ABILITIES.POISON:
                // Add extra wound to hand
                return { effect: 'wound', count: 1, message: 'Vergiftet! +1 Verletzung' };
            case ENEMY_ABILITIES.FIRE:
                // Double damage calculation handled in combat
                return { effect: 'damage_boost', message: 'Feuerangriff! Doppelter Schaden' };
            case ENEMY_ABILITIES.VAMPIRIC: {
                // Heal source
                const heal = 1;
                source.currentHealth = Math.min(source.maxHealth, source.currentHealth + heal);
                return { effect: 'heal', value: heal, message: 'Lebensraub! Feind heilt sich' };
            }
            default:
                return null;
        }
    }

    /**
     * Update all enemies (movement, regeneration, etc.)
     * Called at end of round - NOW ASYNCHRONOUS
     */
    public async updateEnemies(enemies: any[], hero: any): Promise<string[]> {
        if (!this.worker) {
            // Fallback to synchronous logic if worker failed
            return this.updateEnemiesSync(enemies, hero);
        }

        return new Promise((resolve) => {
            this.pendingResolve = resolve;

            // Prepare state to send to worker
            const hexesMap: Record<string, { terrain: string }> = {};
            this.game.hexGrid.hexes.forEach((val: any, key: string) => {
                hexesMap[key] = { terrain: val.terrain };
            });

            const enemyData = enemies.map(e => {
                const isDefeated = typeof e.isDefeated === 'function' ? e.isDefeated() : !!e.isDefeated;
                return {
                    id: e.id,
                    name: e.name,
                    type: e.type,
                    position: e.position ? { q: e.position.q, r: e.position.r } : null,
                    isDefeated,
                    aiPersonality: e.aiPersonality,
                    aiConfig: e.aiConfig
                };
            });

            this.worker!.postMessage({
                action: 'calculateMoves',
                payload: {
                    enemies: enemyData,
                    heroPos: { q: hero.position.q, r: hero.position.r },
                    hexes: hexesMap,
                    difficulty: this.difficulty
                }
            });
        });
    }

    /**
     * Legacy synchronous update for fallback
     /** Legacy synchronous update for fallback */
     public updateEnemiesSync(enemies: any[], hero: any): string[] {
         const moveLog: string[] = [];

         enemies.forEach(enemy => {
             const isDefeated = typeof enemy.isDefeated === 'function' ? enemy.isDefeated() : !!enemy.isDefeated;
             if (isDefeated) return;

             // Simple regeneration
             if (enemy.currentHealth < enemy.maxHealth) {
                 enemy.currentHealth = Math.min(enemy.maxHealth, enemy.currentHealth + 1);
             }

             // Movement Logic - use personality if available
             if (this.canMove(enemy)) {
                 const move = this.getBestMove(enemy, hero.position, enemies);
                 if (move) {
                     enemy.position = move;
                     moveLog.push(`${enemy.name} bewegt sich.`);
                 }
             }
         });

         return moveLog;
     }

     private canMove(enemy: any): boolean {
         // Use personality config if available, otherwise fall back to type-based logic
         if (enemy.aiConfig) {
             // Check wanderWeight - if very low, enemy prefers to stay put
             if (enemy.aiConfig.wanderWeight < 0.15 && !enemy.aiConfig.aggroRadius) return false;
             return enemy.aiConfig.wanderWeight > 0.1 || (enemy.aiConfig.aggroRadius || 0) > 0;
         }

         const roamingTypes = [ENEMY_TYPES.ORC, ENEMY_TYPES.DRACONUM, ENEMY_TYPES.ELEMENTAL, ENEMY_TYPES.ROBBER];
         return roamingTypes.includes(enemy.type);
     }

     private getBestMove(enemy: any, heroPos: { q: number, r: number }, allEnemies: any[]): { q: number, r: number } | null {
         if (!enemy.position) return null;

         const currentQ = enemy.position.q;
         const currentR = enemy.position.r;
         const neighbors = this.game.hexGrid.getNeighbors(currentQ, currentR);

         // Get personality config or use defaults
         const config = enemy.aiConfig || getPersonalityConfig(enemy.aiPersonality) || PERSONALITY_CONFIGS[AI_PERSONALITIES.BALANCED];

         // Filter valid moves
         const validMoves = neighbors.filter((n: { q: number; r: number }) => {
             // Must have hex
             if (!this.game.hexGrid.hasHex(n.q, n.r)) return false;

             // Always avoid Water/Mountains (impassable terrain)
             const hex = this.game.hexGrid.getHex(n.q, n.r);
             if (!hex || hex.terrain === 'water' || hex.terrain === 'mountains') return false;

             // Additional terrain avoidance based on personality (wasteland, etc.)
             if (config.terrainAvoidance > 0.5 && hex.terrain === 'wasteland') return false;
             if (config.terrainAvoidance > 0.7 && hex.terrain === 'desert') return false;

             // Avoid other enemies
             const isOccupied = allEnemies.some(e => {
                 if (e === enemy) return false;
                 const isDefeated = typeof e.isDefeated === 'function' ? e.isDefeated() : !!e.isDefeated;
                 return !isDefeated && e.position && e.position.q === n.q && e.position.r === n.r;
             });
             if (isOccupied) return false;

             // Avoid Hero collision (unless very aggressive)
             if (heroPos.q === n.q && heroPos.r === n.r && config.combatAggression < 0.9) return false;

             return true;
         });

         if (validMoves.length === 0) return null;

         // Aggro distance from personality
         const aggroRadius = config.aggroRadius || 3;
         const distToHero = this.game.hexGrid.distance(currentQ, currentR, heroPos.q, heroPos.r);
         const isAggro = distToHero <= aggroRadius;

         // Flocking: move toward other enemies of same type
         let flockTarget: { q: number; r: number } | null = null;
         if (config.flockingWeight > 0.4) {
             const allies = allEnemies.filter(e => e !== enemy && e.type === enemy.type && e.position &&
                 (typeof e.isDefeated === 'function' ? !e.isDefeated() : !e.isDefeated));
             if (allies.length > 0) {
                 // Find center of allies
                 const avgQ = allies.reduce((sum, e) => sum + e.position!.q, 0) / allies.length;
                 const avgR = allies.reduce((sum, e) => sum + e.position!.r, 0) / allies.length;
                 flockTarget = { q: Math.round(avgQ), r: Math.round(avgR) };
             }
         }

         // Intercept: predict hero's likely path
         let interceptTarget: { q: number; r: number } | null = null;
         if (config.interceptWeight > 0.5 && this.game.hero) {
             const heroLastPos = this.game.hero.position;
             // Simple prediction: hero moves toward nearest objective
             interceptTarget = heroLastPos;
         }

         // Scoring function for moves
         const scoreMove = (move: { q: number; r: number }) => {
             let score = 0;

             // Chase hero
             if (isAggro) {
                 const dist = this.game.hexGrid.distance(move.q, move.r, heroPos.q, heroPos.r);
                 score += (1 - config.chaseWeight) * dist * 10; // Lower is better for chase
                 score -= config.chaseWeight * 50; // Bonus for chasing
             }

             // Flocking
             if (flockTarget && config.flockingWeight > 0) {
                 const flockDist = this.game.hexGrid.distance(move.q, move.r, flockTarget.q, flockTarget.r);
                 score -= config.flockingWeight * flockDist * 5;
             }

             // Intercept
             if (interceptTarget && config.interceptWeight > 0) {
                 const interceptDist = this.game.hexGrid.distance(move.q, move.r, interceptTarget.q, interceptTarget.r);
                 score -= config.interceptWeight * interceptDist * 3;
             }

             // Terrain preference
             const hex = this.game.hexGrid.getHex(move.q, move.r);
             if (hex && hex.terrain !== 'plains') {
                 score += config.terrainAvoidance * 10;
             }

             // Random factor for wander
             if (!isAggro) {
                 score += Math.random() * (1 - config.wanderWeight) * 20;
             }

             return score;
         };

         // Sort by score (lower is better)
         validMoves.sort((a: any, b: any) => scoreMove(a) - scoreMove(b));

         // For backwards compatibility: enemies without explicit personality use old wander logic
         const hasPersonality = !!(enemy.aiConfig || enemy.aiPersonality);
         if (!isAggro) {
             if (hasPersonality) {
                 // Personality-based: skip move if wanderWeight low and random check fails
                 if (config.wanderWeight < 0.3 && Math.random() > config.wanderWeight) {
                     return null;
                 }
             } else {
                 // Old behavior: 20% chance to not move when wandering
                 if (Math.random() < 0.2) return null;
             }
         }

         return validMoves[0];
     }

    /**
     * Reconstitutes an enemy from saved data
     */
    public reconstituteEnemy(eData: any): any {
        let enemy;
        if (eData.isBoss) {
            enemy = createBoss(eData.type, eData.position);
        } else {
            enemy = createEnemy(eData.type, eData.position);
        }

        if (enemy && enemy.loadState) {
            enemy.loadState(eData);
        }

        return enemy;
    }
}
