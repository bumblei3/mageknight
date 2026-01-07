import { BaseSiteHandler, SiteOption } from './BaseSiteHandler';
import { SITE_TYPES } from '../sites';
import { getUnitsForLocation } from '../unit';
import { CARD_DEFINITIONS, SAMPLE_SPELLS } from '../card/CardDefinitions';
// ...
// Spells

export class CityHandler extends BaseSiteHandler {
    public override getOptions(_site: any): SiteOption[] {
        const options: SiteOption[] = [];

        // Expensive Healing
        options.push({
            id: 'heal',
            label: 'Heilen (4 Einfluss / Wunde)',
            action: () => this.healWounds(4),
            enabled: this.game.hero.wounds.length > 0
        });

        // Elite Units
        const units = getUnitsForLocation(SITE_TYPES.CITY);
        options.push({
            id: 'recruit_elite',
            label: 'Elite-Einheiten rekrutieren',
            subItems: units.length > 0 ? units.map(u => ({
                id: `recruit_${u.type}`,
                label: u.name,
                type: 'unit' as const,
                data: u,
                cost: u.cost,
                action: () => this.recruitUnit(u)
            })) : [{ id: 'none', label: 'Keine Einheiten verfügbar', enabled: false }]
        });

        // Spells
        // Spells
        const spells = SAMPLE_SPELLS; // Now objects
        options.push({
            id: 'city_spells',
            label: 'Zauber im Laden (8 Einfluss + Mana)',
            subItems: spells.map(c => ({
                id: `spell_${c.id}`,
                label: c.name,
                type: 'card' as const,
                data: c,
                cost: 8,
                action: () => this.buyCard(c, 8)
            }))
        });

        return options;
    }
}
