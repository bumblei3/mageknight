import { BaseSiteHandler, SiteOption } from './BaseSiteHandler';
import { SITE_TYPES } from '../sites';
import { getUnitsForLocation } from '../unit';

export class VillageHandler extends BaseSiteHandler {
    public override getOptions(_site: any): SiteOption[] {
        const options: SiteOption[] = [];

        // Healing
        options.push({
            id: 'heal',
            label: 'Heilen (3 Einfluss / Wunde)',
            action: () => this.healWounds(3),
            enabled: this.game.hero.wounds.length > 0
        });

        // Recruitment
        const units = getUnitsForLocation(SITE_TYPES.VILLAGE);
        options.push({
            id: 'recruit',
            label: 'Einheiten rekrutieren',
            subItems: units.map(u => ({
                id: `recruit_${u.type}`,
                label: u.name,
                type: 'unit',
                data: u,
                cost: u.cost,
                action: () => this.recruitUnit(u)
            }))
        });

        return options;
    }
}
