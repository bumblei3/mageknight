import { BaseSiteHandler, SiteOption } from './BaseSiteHandler';
import { CARD_DEFINITIONS, SAMPLE_ADVANCED_ACTIONS } from '../card/CardDefinitions';
// ...
// ...
// Training (Advanced Actions)

export class MonasteryHandler extends BaseSiteHandler {
    public override getOptions(_site: any): SiteOption[] {
        const options: SiteOption[] = [];

        // Healing (Cheaper)
        options.push({
            id: 'heal',
            label: 'Heilen (2 Einfluss / Wunde)',
            action: () => this.healWounds(2),
            enabled: this.game.hero.wounds.length > 0
        });

        // Training (Advanced Actions)
        // In a real game, these would be drawn from the deck. Here we use samples.
        const cards = SAMPLE_ADVANCED_ACTIONS; // These are already card data objects
        options.push({
            id: 'train',
            label: 'Training (Karten kaufen)',
            subItems: cards.map(c => ({
                id: `train_${c.id}`,
                label: c.name,
                type: 'card',
                data: c,
                cost: 6, // Simplified cost
                action: () => this.buyCard(c, 6)
            }))
        });

        return options;
    }
}
