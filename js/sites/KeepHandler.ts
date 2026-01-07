import { BaseSiteHandler, SiteOption } from './BaseSiteHandler';
import { SITE_TYPES } from '../sites';
import { getUnitsForLocation } from '../unit';

export class KeepHandler extends BaseSiteHandler {
    public override getOptions(site: any): SiteOption[] {
        const options: SiteOption[] = [];

        if (!site.conquered) {
            options.push({
                id: 'attack',
                label: 'Angreifen (Erobern)',
                action: () => this.attackSite(site),
                enabled: true
            });
        } else {
            // Recruitment
            const units = getUnitsForLocation(SITE_TYPES.KEEP);
            options.push({
                id: 'recruit',
                label: 'Einheiten rekrutieren',
                subItems: units.map(u => ({
                    id: `recruit_${u.type}`,
                    label: u.name,
                    type: 'unit' as const,
                    data: u,
                    cost: u.cost,
                    action: () => this.recruitUnit(u)
                }))
            });
        }
        return options;
    }

    public attackSite(site: any): { success: boolean, message: string } {
        const enemy = {
            name: 'Festungswache',
            armor: 6,
            attack: 4,
            fame: 5,
            icon: '🛡️',
            type: 'keep_guard',
            color: '#9ca3af',
            fortified: true,
            attackType: 'physical'
        };

        const msg = `Kampf gegen ${site.getName()} gestartet! Du musst die Befestigung überwinden.`;
        this.game.addLog(msg, 'warning');
        this.game.combatOrchestrator.initiateCombat(enemy);
        return { success: true, message: 'Direkter Angriff!' };
    }
}
