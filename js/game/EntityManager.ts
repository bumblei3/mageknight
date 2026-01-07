/**
 * Manages game entities: Hero, Units, and Enemies.
 */
import { Hero } from '../hero';
import { Enemy } from '../enemy';

export interface Position {
    q: number;
    r: number;
}

export class EntityManager {
    private game: any;
    public hero: Hero | null;
    public enemies: Enemy[];
    public units: any[];

    constructor(game: any) {
        this.game = game;
        this.hero = null;
        this.enemies = [];
        this.units = [];
    }

    setHero(hero: Hero): void {
        this.hero = hero;
        if (this.game) this.game.hero = hero; // Maintain backward compatibility for now
    }

    /**
     * Create initial enemies for the game board
     */
    createEnemies(): Enemy[] {
        this.enemies = [];
        const { hexGrid, terrain, enemyAI } = this.game;

        if (!hexGrid || !terrain || !enemyAI) {
            console.warn('Cannot create enemies: Dependencies not initialized');
            return [];
        }

        // Generate enemies for all hexes that should have them
        hexGrid.hexes.forEach((hex: any) => {
            // Skip starting area (0,0) and adjacent
            if (Math.abs(hex.q) <= 1 && Math.abs(hex.r) <= 1) return;

            // Chance to spawn enemy based on terrain
            let shouldSpawn = false;
            const terrainName = terrain.getName(hex.terrain);

            if (['ruins', 'keep', 'mage_tower', 'city'].includes(terrainName)) {
                shouldSpawn = true;
            } else if (Math.random() < 0.3 && terrainName !== 'water') {
                shouldSpawn = true;
            }

            if (shouldSpawn) {
                // Calculate level based on distance from center
                const distance = Math.max(Math.abs(hex.q), Math.abs(hex.r), Math.abs(hex.q + hex.r));
                const level = Math.max(1, Math.floor(distance / 2));

                const enemy = enemyAI.generateEnemy(terrainName, level);
                enemy.position = { q: hex.q, r: hex.r };
                // Ensure unique ID
                enemy.id = `enemy_${hex.q}_${hex.r}_${Date.now()}`;

                this.enemies.push(enemy);
            }
        });

        if (this.game) this.game.enemies = this.enemies; // Compatibility
        console.log(`Spawned ${this.enemies.length} enemies.`);
        return this.enemies;
    }

    getEnemyAt(q: number, r: number): Enemy | undefined {
        return this.enemies.find((e: any) => {
            const pos = e.position || e; // Handle both Enemy class and legacy objects
            return pos.q === q && pos.r === r;
        });
    }

    removeEnemy(enemy: Enemy): void {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
            if (this.game) this.game.enemies = this.enemies; // Compatibility
        }
    }

    getUnits(): any[] {
        return this.hero ? this.hero.units : [];
    }

    /**
     * Resets the entity state
     */
    reset(): void {
        this.enemies = [];
        this.units = [];
        if (this.game) this.game.enemies = [];
    }
}
