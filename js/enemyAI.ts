import { ENEMY_TYPES, createEnemy, createBoss } from './enemy';

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

        try {
            this.worker = new Worker(new URL('./workers/aiWorker.js', import.meta.url), { type: 'module' });
            this.worker.onmessage = this.handleWorkerMessage.bind(this);
            console.log('AI Worker initialized');
        } catch (e) {
            console.error('Failed to initialize AI Worker:', e);
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

        // Map existing flags to abilities for AI processing
        if (enemy.poison) enemy.abilities.push(ENEMY_ABILITIES.POISON);

        return enemy;
    }

    /**
     * Calculate enemy action for the turn
     */
    public decideAction(enemy: any, _heroState: any): any {
        // Simple AI: Attack if in range, otherwise wait
        return {
            type: 'attack',
            value: enemy.attack,
            abilities: enemy.abilities
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

            const enemyData = enemies.map(e => ({
                id: e.id,
                name: e.name,
                type: e.type,
                position: e.position ? { q: e.position.q, r: e.position.r } : null,
                isDefeated: typeof e.isDefeated === 'function' ? e.isDefeated() : !!e.isDefeated
            }));

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
     */
    public updateEnemiesSync(enemies: any[], hero: any): string[] {
        const moveLog: string[] = [];

        enemies.forEach(enemy => {
            const isDefeated = typeof enemy.isDefeated === 'function' ? enemy.isDefeated() : !!enemy.isDefeated;
            if (isDefeated) return;

            // Simple regeneration
            if (enemy.currentHealth < enemy.maxHealth) {
                enemy.currentHealth = Math.min(enemy.maxHealth, enemy.currentHealth + 1);
            }

            // Movement Logic
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
        const roamingTypes = [ENEMY_TYPES.ORC, ENEMY_TYPES.DRACONUM, ENEMY_TYPES.ELEMENTAL, ENEMY_TYPES.ROBBER];
        return roamingTypes.includes(enemy.type);
    }

    private getBestMove(enemy: any, heroPos: { q: number, r: number }, allEnemies: any[]): { q: number, r: number } | null {
        if (!enemy.position) return null;

        const currentQ = enemy.position.q;
        const currentR = enemy.position.r;
        const neighbors = this.game.hexGrid.getNeighbors(currentQ, currentR);

        // Filter valid moves
        const validMoves = neighbors.filter((n: any) => {
            // Must have hex
            if (!this.game.hexGrid.hasHex(n.q, n.r)) return false;

            // Avoid Water/Mountains
            const hex = this.game.hexGrid.getHex(n.q, n.r);
            if (!hex || hex.terrain === 'water' || hex.terrain === 'mountains') return false;

            // Avoid other enemies
            const isOccupied = allEnemies.some(e => e !== enemy && !e.isDefeated && e.position && e.position.q === n.q && e.position.r === n.r);
            if (isOccupied) return false;

            // Avoid Hero collision
            if (heroPos.q === n.q && heroPos.r === n.r) return false;

            return true;
        });

        if (validMoves.length === 0) return null;

        // Aggro distance
        const distToHero = this.game.hexGrid.distance(currentQ, currentR, heroPos.q, heroPos.r);
        const isAggro = distToHero <= 3;

        if (isAggro) {
            // Move closer
            validMoves.sort((a: any, b: any) => {
                const da = this.game.hexGrid.distance(a.q, a.r, heroPos.q, heroPos.r);
                const db = this.game.hexGrid.distance(b.q, b.r, heroPos.q, heroPos.r);
                return da - db;
            });
            return validMoves[0];
        } else {
            // Random wander
            if (Math.random() < 0.2) return null;
            return validMoves[Math.floor(Math.random() * validMoves.length)];
        }
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
