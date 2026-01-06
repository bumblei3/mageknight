/**
 * Test helper functions for Mage Knight tests
 * Provides common setup patterns and utilities
 */

import { Hero } from '../js/hero.js';
import { Card } from '../js/card.js';
import { HexGrid } from '../js/hexgrid.js';
import { createMockCanvas } from './test-mocks.js';

/**
 * Creates a mock enemy with configurable properties
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Mock enemy object
 */
export function createMockEnemy(overrides = {}) {
    const defaults = {
        id: Math.random().toString(36).substr(2, 9),
        name: 'Mock Enemy',
        armor: 3,
        attack: 4,
        fame: 2,
        maxHealth: 3,
        currentHealth: 3,
        icon: '👹',
        color: 'red',
        swift: false,
        fortified: false,
        poison: false,
        vampiric: false,
        abilities: [],
        getEffectiveAttack: function () { return this.attack; },
        getBlockRequirement: function () { return this.swift ? this.attack * 2 : this.attack; },
        getResistanceMultiplier: function (element) { return 1; }
    };

    const enemy = { ...defaults, ...overrides };

    // Update abilities array based on boolean flags
    if (enemy.swift && !enemy.abilities.includes('swift')) {
        enemy.abilities.push('swift');
    }
    if (enemy.poison && !enemy.abilities.includes('poison')) {
        enemy.abilities.push('poison');
    }
    if (enemy.vampiric && !enemy.abilities.includes('vampiric')) {
        enemy.abilities.push('vampiric');
    }
    if (enemy.fortified && !enemy.abilities.includes('fortified')) {
        enemy.abilities.push('fortified');
    }

    return enemy;
}

/**
 * Creates a hero with a specific hand of cards
 * @param {string} name - Hero name
 * @param {Array} cards - Array of card objects or card configs
 * @returns {Hero}
 */
export function createHeroWithHand(name = 'TestHero', cards = []) {
    const hero = new Hero(name);
    hero.hand = [];

    // Clear initial hand
    hero.discard = [];
    hero.deck = [];

    // Add specified cards
    cards.forEach(cardOrConfig => {
        let card;
        if (cardOrConfig instanceof Card) {
            card = cardOrConfig;
        } else if (typeof cardOrConfig === 'object') {
            // Create card from config
            card = new Card(
                cardOrConfig.name || 'Test Card',
                cardOrConfig.color || 'green',
                cardOrConfig.effects || { movement: 1 },
                cardOrConfig.sidewaysEffects || { movement: 1 }
            );
        } else {
            // Default card
            card = new Card('Basic Card', 'green', { movement: 1 }, { movement: 1 });
        }
        hero.hand.push(card);
    });

    return hero;
}

/**
 * Creates a hero with specific stats
 * @param {Object} stats - Stats to set on hero
 * @returns {Hero}
 */
export function createHeroWithStats(stats = {}) {
    const hero = new Hero(stats.name || 'TestHero');

    if (stats.level !== undefined) hero.level = stats.level;
    if (stats.fame !== undefined) hero.fame = stats.fame;
    if (stats.reputation !== undefined) hero.reputation = stats.reputation;
    if (stats.armor !== undefined) hero.armor = stats.armor;
    if (stats.handLimit !== undefined) hero.handLimit = stats.handLimit;
    if (stats.commandLimit !== undefined) hero.commandLimit = stats.commandLimit;
    if (stats.movementPoints !== undefined) hero.movementPoints = stats.movementPoints;
    if (stats.attackPoints !== undefined) hero.attackPoints = stats.attackPoints;
    if (stats.blockPoints !== undefined) hero.blockPoints = stats.blockPoints;
    if (stats.influencePoints !== undefined) hero.influencePoints = stats.influencePoints;
    if (stats.healingPoints !== undefined) hero.healingPoints = stats.healingPoints;

    return hero;
}

/**
 * Creates a mock HexGrid with canvas
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {HexGrid}
 */
export function createMockHexGrid(width = 800, height = 600) {
    const canvas = createMockCanvas(width, height);
    return new HexGrid(canvas);
}

/**
 * Populates a hex grid with a pattern of hexes
 * @param {HexGrid} hexGrid - The hex grid to populate
 * @param {Object} pattern - Pattern configuration
 * @returns {HexGrid}
 */
export function populateHexGrid(hexGrid, pattern = {}) {
    const {
        radius = 2,
        centerTerrain = 'plains',
        fillTerrain = 'forest',
        revealed = true
    } = pattern;

    // Create hexes in a radius around 0,0
    for (let q = -radius; q <= radius; q++) {
        for (let r = -radius; r <= radius; r++) {
            if (Math.abs(q + r) <= radius) {
                const terrain = (q === 0 && r === 0) ? centerTerrain : fillTerrain;
                hexGrid.setHex(q, r, { terrain, revealed });
            }
        }
    }

    return hexGrid;
}

/**
 * Creates a specific card by type
 * @param {string} type - Card type: 'basic', 'wound', 'powerful', etc.
 * @returns {Card}
 */
export function createCard(type = 'basic') {
    const cardTypes = {
        basic: new Card('Basic Action', 'green', { movement: 2 }, { movement: 1 }),
        wound: new Card('Wound', 'wound', {}, {}),
        powerful: new Card('Powerful Strike', 'red', { attack: 5 }, { attack: 3 }),
        defensive: new Card('Shield', 'blue', { block: 4 }, { block: 2 }),
        influence: new Card('Diplomacy', 'white', { influence: 3 }, { influence: 2 }),
        healing: new Card('Heal', 'white', { healing: 2 }, { healing: 1 }),
        mixed: new Card('Versatile', 'gold',
            { movement: 2, attack: 2 },
            { movement: 1, attack: 1 }
        )
    };

    return cardTypes[type] || cardTypes.basic;
}

/**
 * Creates an array of specific cards
 * @param {Array<string>} types - Array of card type strings
 * @returns {Array<Card>}
 */
export function createCards(types) {
    return types.map(type => createCard(type));
}

/**
 * Simulates a combat turn
 * @param {Combat} combat - Combat instance
 * @param {Object} actions - Actions to perform
 */
export function simulateCombatTurn(combat, actions = {}) {
    const {
        blockActions = [],
        attackValue = 0,
        attackElement = 'physical',
        targetEnemies = null
    } = actions;

    // Block phase
    blockActions.forEach(({ enemy, blockValue }) => {
        combat.blockEnemy(enemy, blockValue);
    });

    combat.endBlockPhase();

    // Attack phase
    if (attackValue > 0) {
        combat.attackEnemies(attackValue, attackElement, targetEnemies);
    }
}

/**
 * Asserts that an object has all expected properties
 * @param {Object} obj - Object to check
 * @param {Array<string>} properties - Expected properties
 * @returns {boolean}
 */
export function hasProperties(obj, properties) {
    return properties.every(prop => obj.hasOwnProperty(prop));
}

/**
 * Creates a mock game state object
 * @param {Object} overrides - State properties to override
 * @returns {Object}
 */
export function createMockGameState(overrides = {}) {
    return {
        turnNumber: 0,
        roundNumber: 1,
        timeOfDay: 'day',
        heroPosition: { q: 0, r: 0 },
        revealed: true,
        enemies: [],
        ...overrides
    };
}

/**
 * Waits for a condition to be true (useful for async tests)
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Timeout in ms
 * @param {number} interval - Check interval in ms
 * @returns {Promise<boolean>}
 */
export async function waitForCondition(condition, timeout = 1000, interval = 50) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        if (condition()) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }

    return false;
}

/**
 * Deep clones an object (for test isolation)
 * @param {Object} obj - Object to clone
 * @returns {Object}
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Creates a combat scenario with configured enemy and hero
 * @param {Object} config - Configuration object
 * @returns {Combat}
 */
export function createCombatScenario(config = {}) {
    const {
        heroConfig = {},
        enemyConfig = {},
        startCombat = true
    } = config;

    const hero = createHeroWithStats(heroConfig);
    const enemy = createMockEnemy(enemyConfig);

    // Import Combat dynamically to avoid circular dependencies
    const Combat = config.CombatClass;
    if (!Combat) {
        throw new Error('CombatClass must be provided in config');
    }

    const combat = new Combat(hero, enemy);
    if (startCombat) {
        combat.start();
    }

    return { combat, hero, enemy };
}

/**
 * Batch assertions for hero state
 * @param {Hero} hero - Hero to check
 * @param {Object} expected - Expected state
 */
export function assertHeroState(hero, expected) {
    const checks = {
        level: () => hero.level === expected.level,
        fame: () => hero.fame === expected.fame,
        reputation: () => hero.reputation === expected.reputation,
        armor: () => hero.armor === expected.armor,
        handSize: () => hero.hand.length === expected.handSize,
        wounds: () => hero.wounds.length === expected.wounds,
        movementPoints: () => hero.movementPoints === expected.movementPoints,
        attackPoints: () => hero.attackPoints === expected.attackPoints,
        blockPoints: () => hero.blockPoints === expected.blockPoints,
        influencePoints: () => hero.influencePoints === expected.influencePoints
    };

    for (const [key, check] of Object.entries(checks)) {
        if (expected.hasOwnProperty(key) && !check()) {
            throw new Error(`Hero ${key} mismatch: expected ${expected[key]} but got ${hero[key]}`);
        }
    }
    return true;
}

/**
 * Batch assertions for combat state
 * @param {Combat} combat - Combat to check
 * @param {Object} expected - Expected state
 */
export function assertCombatState(combat, expected) {
    const checks = {
        phase: () => combat.phase === expected.phase,
        victory: () => combat.victory === expected.victory,
        enemiesRemaining: () => combat.enemies.filter(e => !e.isDefeated(combat.hero.attackPoints)).length === expected.enemiesRemaining,
        woundsReceived: () => combat.woundsReceived === expected.woundsReceived
    };

    for (const [key, check] of Object.entries(checks)) {
        if (expected.hasOwnProperty(key) && !check()) {
            throw new Error(`Combat ${key} mismatch: expected ${expected[key]} but got value doesn't match`);
        }
    }
    return true;
}

/**
 * Creates a mock tile with specified terrain types
 * @param {Array<string>} terrains - Array of 7 terrain types for tile hexes
 * @param {boolean} revealed - Whether tile hexes should be revealed
 * @returns {Array<Object>}
 */
export function createMockTile(terrains = ['plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains'], revealed = true) {
    return terrains.map(terrain => ({ terrain, revealed }));
}

/**
 * Simulates a full turn in the game
 * @param {Game} game - Game instance
 * @param {Object} actions - Actions to perform during turn
 */
export function simulateFullTurn(game, actions = {}) {
    const {
        cardsToPlay = [],
        moveTo = null,
        combat = null,
        endTurn = true
    } = actions;

    // Play cards
    cardsToPlay.forEach(cardIndex => {
        if (typeof cardIndex === 'number') {
            game.hero.playCard(cardIndex);
        } else if (typeof cardIndex === 'object') {
            game.hero.playCard(cardIndex.index, cardIndex.sideways);
        }
    });

    // Move
    if (moveTo) {
        game.hero.position = moveTo;
    }

    // Combat
    if (combat) {
        const { enemy, block, attack } = combat;
        game.combatOrchestrator.initiateCombat(enemy);
        if (block) {
            game.combat.blockEnemy(enemy, block);
        }
        game.combat.endBlockPhase();
        if (attack) {
            game.combat.attackEnemies(attack);
        }
        game.combat.endCombat();
    }

    // End turn
    if (endTurn) {
        game.hero.endTurn();
    }
}

/**
 * Expects async function to throw with specific error
 * @param {Function} fn - Async function to test
 * @param {string} expectedError - Expected error message substring
 * @returns {Promise<boolean>}
 */
export async function expectThrowsAsync(fn, expectedError) {
    let thrown = false;
    let error;
    try {
        await fn();
    } catch (e) {
        thrown = true;
        error = e;
    }

    if (!thrown) {
        throw new Error('Expected async function to throw but it did not');
    }

    if (expectedError && !error.message.includes(expectedError)) {
        throw new Error(`Expected error message to include "${expectedError}" but got "${error.message}"`);
    }

    return true;
}

/**
 * Builder pattern for creating Hero instances in tests
 */
export class HeroBuilder {
    constructor(name = 'TestHero') {
        this.hero = new Hero(name);
    }

    withLevel(level) {
        this.hero.level = level;
        return this;
    }

    withFame(fame) {
        this.hero.fame = fame;
        return this;
    }

    withStats(stats) {
        Object.assign(this.hero, stats);
        return this;
    }

    withHand(cards) {
        this.hero.hand = cards;
        return this;
    }

    withDeck(cards) {
        this.hero.deck = cards;
        return this;
    }

    build() {
        return this.hero;
    }
}

/**
 * Standardized setup for combat tests
 * @param {Object} config - Configuration for hero and enemy
 * @param {Class} CombatClass - The Combat class constructor (dependency injection)
 * @returns {Object} { hero, enemy, combat }
 */
export function setupCombatTest(config = {}, CombatClass) {
    const {
        heroConfig = {},
        enemyConfig = {},
        start = true
    } = config;

    const hero = createHeroWithStats(heroConfig);
    const enemy = createMockEnemy(enemyConfig);

    let combat = null;
    if (CombatClass) {
        combat = new CombatClass(hero, enemy);
        if (start) combat.start();
    }

    return { hero, enemy, combat };
}
