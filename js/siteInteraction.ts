import { SITE_TYPES } from './sites';

export class SiteInteractionManager {
    private game: any;
    private currentSiteHandler: any;

    constructor(game: any) {
        this.game = game;
        this.currentSiteHandler = null;
    }

    visitSite(hex: any, site: any): any {
        const options: any[] = [];

        switch (site.type) {
            case SITE_TYPES.VILLAGE:
                options.push({
                    id: 'heal',
                    label: 'Heilen',
                    cost: 3,
                    enabled: this.game.hero.influencePoints >= 3 && this.game.hero.wounds.length > 0
                });
                options.push({
                    id: 'recruit',
                    label: 'Rekrutieren',
                    cost: 3,
                    enabled: this.game.hero.influencePoints >= 3
                });
                break;
            case SITE_TYPES.MONASTERY:
                options.push({ id: 'learn_spell', label: 'Zauber lernen', cost: 2 });
                break;
            case SITE_TYPES.MAGE_TOWER:
                options.push({ id: 'buy_spell', label: 'Zauber kaufen', cost: 5 });
                break;
            case SITE_TYPES.KEEP:
            case SITE_TYPES.DUNGEON:
            case SITE_TYPES.CITY:
                options.push({ id: 'attack', label: 'Angreifen', cost: 0 });
                break;
            default:
                options.push({ id: 'explore', label: 'Erkunden', cost: 0 });
        }

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
