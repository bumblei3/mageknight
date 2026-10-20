import { createUnit } from '../unit';
import { createDeck } from '../card';

export interface SiteOption {
    id: string;
    label: string;
    action?: () => any;
    enabled?: boolean;
    subItems?: SiteOption[];
    type?: 'unit' | 'card' | 'action';
    data?: any;
    cost?: number;
}

export class BaseSiteHandler {
    protected game: any;

    constructor(game: any) {
        this.game = game;
    }

    public getOptions(_site: any, _context?: any): SiteOption[] {
        return [];
    }

    /**
     * Reputation lowers or raises an influence price. The result never goes below 0.
     * +2 at reputation 3+, +1 at 1+, −1 at −2 or worse, −2 at −5 or worse.
     */
    public influenceCost(base: number): number {
        const hero = this.game?.hero;
        const modifier = hero && typeof hero.getReputationModifier === 'function'
            ? Number(hero.getReputationModifier()) || 0
            : 0;
        const amount = Number(base);
        return Math.max(0, (Number.isFinite(amount) ? amount : 0) - modifier);
    }

    public healWounds(costPerWound: number): { success: boolean, message: string } {
        const price = this.influenceCost(costPerWound);
        if (this.game.hero.influencePoints >= price && this.game.hero.wounds.length > 0) {
            if (this.game.hero.healWound(false)) {
                this.game.hero.influencePoints -= price;
                const msg = 'Wunde geheilt!';
                this.game.addLog(msg, 'success');
                return { success: true, message: msg };
            }
        }
        return { success: false, message: 'Nicht genug Einfluss oder keine Wunden.' };
    }

    public recruitUnit(unitInfo: any): { success: boolean, message: string } {
        const price = this.influenceCost(unitInfo.cost);
        if (this.game.hero.influencePoints >= price) {
            const instance = unitInfo.create ? unitInfo.create() : createUnit(unitInfo.type);

            if (!instance) {
                return { success: false, message: 'Einheiten-Typ unbekannt.' };
            }

            // Ensure ID is unique
            instance.id = `${unitInfo.type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            if (this.game.hero.addUnit(instance)) {
                this.game.hero.influencePoints -= price;
                const msg = `Einheit ${instance.name || instance.getName()} rekrutiert!`;
                this.game.addLog(msg, 'success');
                this.game.updateStats();
                return { success: true, message: msg };
            } else {
                return { success: false, message: 'Kein Platz für weitere Einheiten (Command Limit).' };
            }
        }
        return { success: false, message: 'Nicht genug Einfluss.' };
    }

    public buyCard(cardData: any, cost: number): { success: boolean, message: string } {
        const price = this.influenceCost(cost);
        const manaColor = cardData.color;
        const isSpell = cardData.type === 'spell';
        let spendToken = false;
        let crystalKey: string | null = null;

        if (isSpell) {
            const inventory = this.game.hero.getManaInventory();
            const crystals = this.game.hero.crystals || {};
            const upper = typeof manaColor === 'string' ? manaColor.toUpperCase() : '';
            const lower = typeof manaColor === 'string' ? manaColor.toLowerCase() : '';
            if (inventory.includes(manaColor)) {
                spendToken = true;
            } else if (upper && crystals[upper] > 0) {
                crystalKey = upper;
            } else if (lower && crystals[lower] > 0) {
                crystalKey = lower;
            } else {
                return { success: false, message: `Du benötigst ein ${manaColor}-Mana (oder Kristall) zum Lernen!` };
            }
        }

        if (this.game.hero.influencePoints < price) {
            return { success: false, message: 'Nicht genug Einfluss.' };
        }

        if (spendToken) {
            this.game.hero.removeMana(manaColor);
        } else if (crystalKey) {
            this.game.hero.crystals[crystalKey]--;
        }

        const card = createDeck([cardData])[0];
        this.game.hero.discard.push(card);
        this.game.hero.influencePoints -= price;
        const msg = `Karte ${card.name} gelernt!`;
        this.game.addLog(msg, 'success');
        return { success: true, message: msg };
    }
}
