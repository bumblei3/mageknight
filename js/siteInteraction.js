// Site Interaction Manager
// Handles logic for visiting sites (Villages, Monasteries, etc.)

import { SITE_TYPES } from './sites.js';

// Import New Handlers
import { VillageHandler } from './sites/VillageHandler.js';
import { MonasteryHandler } from './sites/MonasteryHandler.js';
import { CityHandler } from './sites/CityHandler.js';
import { KeepHandler } from './sites/KeepHandler.js';
import { MageTowerHandler } from './sites/MageTowerHandler.js';
import { MineHandler } from './sites/MineHandler.js';
import { ExplorationHandler } from './sites/ExplorationHandler.js';

export class SiteInteractionManager {
    constructor(game) {
        this.game = game;
        this.currentSite = null;
        this.currentHex = null;

        // Initialize Handlers
        this.handlers = {
            [SITE_TYPES.VILLAGE]: new VillageHandler(game),
            [SITE_TYPES.MONASTERY]: new MonasteryHandler(game),
            [SITE_TYPES.CITY]: new CityHandler(game),
            [SITE_TYPES.KEEP]: new KeepHandler(game),
            [SITE_TYPES.MAGE_TOWER]: new MageTowerHandler(game),
            [SITE_TYPES.MINE]: new MineHandler(game),

            // Exploration Group
            [SITE_TYPES.DUNGEON]: new ExplorationHandler(game),
            [SITE_TYPES.RUIN]: new ExplorationHandler(game),
            [SITE_TYPES.TOMB]: new ExplorationHandler(game),
            [SITE_TYPES.LABYRINTH]: new ExplorationHandler(game),
            [SITE_TYPES.SPAWNING_GROUNDS]: new ExplorationHandler(game),
        };
    }

    // Start interaction with a site
    visitSite(hex, site) {
        this.currentHex = hex;
        this.currentSite = site;

        const interactionData = {
            type: site.type,
            name: site.getName(),
            icon: site.getIcon(),
            color: site.getColor ? site.getColor() : '#ffffff',
            description: site.getInfo ? site.getInfo().description : 'Ort erkundet.',
            options: []
        };

        const handler = this.handlers[site.type];
        if (handler) {
            interactionData.options = handler.getOptions(site, hex);
        } else {
            console.warn(`No handler for site type: ${site.type}`);
            interactionData.options = [];
        }

        return interactionData;
    }

    // ============================================================
    // Proxy Methods for Backward Compatibility & Testing
    // These methods delegate to the appropriate handler logic.
    // ============================================================

    healWounds(costPerWound) {
        // Generic logic, can use any handler instance that extends Base
        return this.handlers[SITE_TYPES.VILLAGE].healWounds(costPerWound);
    }

    recruitUnit(unitInfo) {
        return this.handlers[SITE_TYPES.VILLAGE].recruitUnit(unitInfo);
    }

    buyCard(cardData, cost) {
        return this.handlers[SITE_TYPES.MONASTERY].buyCard(cardData, cost);
    }

    attackSite() {
        if (!this.currentSite) return { success: false, message: 'Kein Ort gewählt' };
        const handler = this.handlers[this.currentSite.type];
        if (handler && handler.attackSite) {
            return handler.attackSite(this.currentSite);
        }
        return { success: false, message: 'Angriff nicht möglich' };
    }

    attackMine() {
        return this.handlers[SITE_TYPES.MINE].attackMine();
    }

    collectMineCrystal() {
        return this.handlers[SITE_TYPES.MINE].collectMineCrystal(this.currentHex);
    }

    exploreDungeon() { return this.handlers[SITE_TYPES.DUNGEON].exploreDungeon(); }
    exploreRuin() { return this.handlers[SITE_TYPES.RUIN].exploreRuin(); }
    exploreTomb() { return this.handlers[SITE_TYPES.TOMB].exploreTomb(); }
    exploreLabyrinth() { return this.handlers[SITE_TYPES.LABYRINTH].exploreLabyrinth(); }
    exploreSpawningGrounds() { return this.handlers[SITE_TYPES.SPAWNING_GROUNDS].exploreSpawningGrounds(); }
}
