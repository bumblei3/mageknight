import { SITE_TYPES } from './sites';
import { MineHandler } from './sites/MineHandler';
import { KeepHandler } from './sites/KeepHandler';
import { MageTowerHandler } from './sites/MageTowerHandler';
import { MonasteryHandler } from './sites/MonasteryHandler';
import { VillageHandler } from './sites/VillageHandler';
import { ExplorationHandler } from './sites/ExplorationHandler';
import { SpawningGroundsHandler } from './sites/SpawningGroundsHandler';
import { LabyrinthHandler } from './sites/LabyrinthHandler';
import { BaseSiteHandler, SiteOption } from './sites/BaseSiteHandler';

export class SiteInteractionManager {
    private game: any;
    private currentSiteHandler: BaseSiteHandler | null = null;
    private handlers: Map<string, BaseSiteHandler>;

    constructor(game: any) {
        this.game = game;
        this.handlers = new Map();
        this.initializeHandlers();
    }

    private initializeHandlers(): void {
        this.handlers.set(SITE_TYPES.MINE, new MineHandler(this.game));
        this.handlers.set(SITE_TYPES.KEEP, new KeepHandler(this.game));
        this.handlers.set(SITE_TYPES.MAGE_TOWER, new MageTowerHandler(this.game));
        this.handlers.set(SITE_TYPES.MONASTERY, new MonasteryHandler(this.game));
        this.handlers.set(SITE_TYPES.VILLAGE, new VillageHandler(this.game));
        this.handlers.set(SITE_TYPES.DUNGEON, new ExplorationHandler(this.game));
        this.handlers.set(SITE_TYPES.RUINS, new ExplorationHandler(this.game));
        this.handlers.set(SITE_TYPES.TOMB, new ExplorationHandler(this.game));
        this.handlers.set(SITE_TYPES.LABYRINTH, new LabyrinthHandler(this.game));
        this.handlers.set(SITE_TYPES.SPAWNING_GROUNDS, new SpawningGroundsHandler(this.game));
    }

    private getHandler(siteType: string): BaseSiteHandler | null {
        // Fallback to ExplorationHandler for unhandled types
        return this.handlers.get(siteType) || this.handlers.get(SITE_TYPES.DUNGEON) || null;
    }

    visitSite(hex: any, site: any): any {
        const handler = this.getHandler(site.type);
        const options = handler ? handler.getOptions(site, hex) : [];

        return {
            type: site.type,
            name: site.name || site.type,
            options,
            hex
        };
    }

    recruitUnit(unit: any): any {
        const hero = this.game.hero;

        if (hero.influencePoints < unit.cost) {
            return { success: false, reason: 'Nicht genug Einflusspunkte' };
        }

        if (hero.commandLimit <= 0) {
            return { success: false, reason: 'Kommandolimit erreicht' };
        }

        hero.influencePoints -= unit.cost;
        hero.units.push(unit);
        hero.commandLimit--;

        if (this.game.updateStats) this.game.updateStats();

        return { success: true, unit };
    }

    healWounds(cost: number): any {
        const hero = this.game.hero;

        if (hero.wounds.length === 0) {
            return { success: false, reason: 'Keine Wunden vorhanden' };
        }

        if (hero.influencePoints < cost) {
            return { success: false, reason: 'Nicht genug Einflusspunkte' };
        }

        hero.influencePoints -= cost;
        hero.wounds = [];

        if (this.game.updateStats) this.game.updateStats();

        return { success: true, healed: 1 };
    }

    handleSiteInteraction(hex: any): void {
        const site = hex.site;
        if (!site) return;

        console.log('Interacting with site:', site);
        if (this.game.ui && this.game.ui.siteModal) {
            // this.game.ui.siteModal.open(site);
        }
    }

    checkSiteEntry(hex: any): boolean {
        return true;
    }
}
