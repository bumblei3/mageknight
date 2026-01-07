import { BaseSiteHandler, SiteOption } from './BaseSiteHandler';
import { CARD_DEFINITIONS, SAMPLE_SPELLS } from '../card/CardDefinitions';
// ...
// ...
// ...
// Spells

export class MageTowerHandler extends BaseSiteHandler {
    public override getOptions(site: any): SiteOption[] {
        const options: SiteOption[] = [];

        if (!site.conquered) {
            options.push({
                id: 'attack',
                label: 'Magierturm angreifen (Erobern)',
                action: () => this.attackSite(site),
                enabled: true
            });
        } else {
            // Spells
            const cards = SAMPLE_SPELLS; // These are now objects, not IDs
            options.push({
                id: 'spells',
                label: 'Zauber lernen (7 Einfluss + Mana)',
                subItems: cards.map(c => ({
                    id: `spell_${c.id}`,
                    label: c.name,
                    type: 'card' as const,
                    data: c,
                    cost: 7, // Simplified cost
                    action: () => this.buyCard(c, 7)
                }))
            });
        }

        return options;
    }

    public attackSite(site: any): { success: boolean, message: string } {
        const enemy = {
            name: 'Wächter des Turms',
            armor: 5,
            attack: 5,
            fame: 6,
            icon: '🧙',
            type: 'tower_guard',
            color: '#8b5cf6',
            fortified: true,
            attackType: 'fire'
        };

        const msg = `Kampf gegen ${site.getName()} gestartet! Du musst die Befestigung überwinden.`;
        this.game.addLog(msg, 'warning');
        this.game.combatOrchestrator.initiateCombat(enemy);
        return { success: true, message: 'Direkter Angriff!' };
    }
}
