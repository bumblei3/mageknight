import { ENEMY_TYPES, createEnemy, createBoss } from './enemy.js';

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
};

export class EnemyAI {
    constructor(game) {
        this.game = game;
        this.difficulty = 1; // 1-10 scale

        // Initialize Worker
        this.worker = null;
        this.pendingResolve = null;

        try {
            this.worker = new Worker('./js/workers/aiWorker.js', { type: 'module' });
            this.worker.onmessage = this.handleWorkerMessage.bind(this);
            console.log('AI Worker initialized');
        } catch (e) {
            console.error('Failed to initialize AI Worker:', e);
        }
    }

    handleWorkerMessage(e) {
        const { action, payload } = e.data;
        if (action === 'movesCalculated' && this.pendingResolve) {
            const { newPositions, moveLog } = payload;

            // Apply new positions
            newPositions.forEach(p => {
                const enemy = this.game.enemies.find(e => e.id === p.id);
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
    generateEnemy(terrainType, level = 1) {
        const difficulty = Math.min(10, Math.ceil(level / 2) + this.difficulty);

        let type = ENEMY_TYPES.ORC;

        // Determine type based on terrain and difficulty
        if (terrainType === 'mountain' || terrainType === 'wasteland') {
            if (difficulty > 7) type = ENEMY_TYPES.DRACONUM;
            else if (difficulty > 5) type = ENEMY_TYPES.ELEMENTAL;
            else type = ENEMY_TYPES.ORC;
        } else if (terrainType === 'swamp' || terrainType === 'ruins') {
            if (difficulty > 6) type = ENEMY_TYPES.NECROMANCER;
            else if (difficulty > 4) type = ENEMY_TYPES.MAGE_TOWER;
            else type = ENEMY_TYPES.ORC;
        } else if (terrainType === 'forest') {
            if (difficulty > 3) type = ENEMY_TYPES.ROBBER;
        }

        // Create base enemy
        const enemy = createEnemy(type);
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

        // Map existing flags to abilities for AI processing
        if (enemy.poison) enemy.abilities.push(ENEMY_ABILITIES.POISON);

        return enemy;
    }

    /**
     * Calculate enemy action for the turn
     */
    decideAction(enemy, _heroState) {
        // Simple AI: Attack if in range, otherwise wait
        // Could be expanded for complex behaviors
        return {
            type: 'attack',
            value: enemy.attack,
            abilities: enemy.abilities
        };
    }

    /**
     * Apply ability effects
     */
    applyAbility(ability, target, source) {
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
     * @param {Array} enemies
     * @param {Object} hero
     */
    async updateEnemies(enemies, hero) {
        if (!this.worker) {
            // Fallback to synchronous logic if worker failed
            return this.updateEnemiesSync(enemies, hero);
        }

        return new Promise((resolve) => {
            this.pendingResolve = resolve;

            // Prepare state to send to worker
            // We need to pass serializable data
            const hexesMap = {};
            this.game.hexGrid.hexes.forEach((val, key) => {
                hexesMap[key] = { terrain: val.terrain };
            });

            const enemyData = enemies.map(e => ({
                id: e.id,
                name: e.name,
                type: e.type,
                position: e.position ? { q: e.position.q, r: e.position.r } : null,
                isDefeated: typeof e.isDefeated === 'function' ? e.isDefeated() : !!e.isDefeated
            }));

            this.worker.postMessage({
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
     */
    updateEnemiesSync(enemies, hero) {
        const moveLog = [];

        enemies.forEach(enemy => {
            const isDefeated = typeof enemy.isDefeated === 'function' ? enemy.isDefeated() : !!enemy.isDefeated;
            if (isDefeated) return;

            // Simple regeneration
            if (enemy.currentHealth < enemy.maxHealth) {
                enemy.currentHealth = Math.min(enemy.maxHealth, enemy.currentHealth + 1);
            }

            // Movement Logic
            // Only move non-fortified enemies (Orcs, Draconum, etc. in open terrain)
            // Bosses might have special movement rules
            // Keeps/Mage Towers/Cities are static usually, unless we add roaming armies.
            // For now, let's assume all basic enemies can move if they are not in a site.

            // Check if enemy is "roaming" capable
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

    canMove(enemy) {
        // Basic enemies roam. Static sites do not.
        // We can check enemy type or a 'static' flag.
        // For now, assume Orcs, Draconum, Elementals roam.
        const roamingTypes = [ENEMY_TYPES.ORC, ENEMY_TYPES.DRACONUM, ENEMY_TYPES.ELEMENTAL, ENEMY_TYPES.ROBBER];
        return roamingTypes.includes(enemy.type);
    }

    getBestMove(enemy, heroPos, allEnemies) {
        if (!enemy.position) return null;

        const currentQ = enemy.position.q;
        const currentR = enemy.position.r;
        const neighbors = this.game.hexGrid.getNeighbors(currentQ, currentR);

        // Filter valid moves
        const validMoves = neighbors.filter(n => {
            // Must have hex
            if (!this.game.hexGrid.hasHex(n.q, n.r)) return false;

            // Avoid Water/Mountains (unless flying?)
            const hex = this.game.hexGrid.getHex(n.q, n.r);
            if (!hex || hex.terrain === 'water' || hex.terrain === 'mountains') return false;

            // Avoid other enemies
            const isOccupied = allEnemies.some(e => e !== enemy && !e.isDefeated && e.position && e.position.q === n.q && e.position.r === n.r);
            if (isOccupied) return false;

            // Avoid Hero collision (unless attacking? For now avoid stacking)
            if (heroPos.q === n.q && heroPos.r === n.r) return false;

            return true;
        });

        if (validMoves.length === 0) return null;

        // Behavior: Aggressive (move towards hero) or Passive (random)
        // Aggro range: 3 hexes
        const distToHero = this.game.hexGrid.distance(currentQ, currentR, heroPos.q, heroPos.r);
        const isAggro = distToHero <= 3;

        if (isAggro) {
            // Move closer
            validMoves.sort((a, b) => {
                const da = this.game.hexGrid.distance(a.q, a.r, heroPos.q, heroPos.r);
                const db = this.game.hexGrid.distance(b.q, b.r, heroPos.q, heroPos.r);
                return da - db;
            });
            return validMoves[0];
        } else {
            // Random wander (20% chance to stay still)
            if (Math.random() < 0.2) return null;
            return validMoves[Math.floor(Math.random() * validMoves.length)];
        }
    }

    /**
     * Reconstitutes an enemy from saved data
     */
    reconstituteEnemy(eData) {
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
