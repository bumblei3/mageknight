import { BaseSiteHandler, SiteOption } from './BaseSiteHandler';
import { SITE_TYPES } from '../sites';

export class LabyrinthHandler extends BaseSiteHandler {
    public override getOptions(site: any): SiteOption[] {
        if (site.conquered) {
            return [{
                id: 'cleared',
                label: 'Labyrinth bereits durchquert',
                enabled: false,
                action: () => { }
            }];
        }

        return [{
            id: 'explore_labyrinth',
            label: 'Labyrinth betreten (Mehrere Kämpfe)',
            action: () => this.exploreLabyrinth(),
            enabled: true
        }];
    }

    public exploreLabyrinth(): { success: boolean, message: string } {
        const enemies: any[] = [];

        // Enemy 1: Magic Theme
        const isMage = Math.random() > 0.5;
        enemies.push(isMage ? {
            id: `labyrinth_mage_${Date.now()}`,
            name: 'Labyrinth-Magier',
            armor: 3,
            attack: 5,
            attackType: 'ice',
            fame: 6,
            icon: '🧙',
            type: 'mage',
            color: '#3b82f6'
        } : {
            id: `labyrinth_golem_${Date.now()}`,
            name: 'Stein-Golem',
            armor: 7,
            attack: 4,
            fame: 5,
            icon: '🗿',
            type: 'golem',
            color: '#6b7280',
            physicalResist: true
        });

        // Enemy 2: Dungeon Theme
        const isDragon = Math.random() > 0.6;
        enemies.push(isDragon ? {
            id: `labyrinth_dragon_${Date.now()}`,
            name: 'Drakonier',
            armor: 6,
            attack: 5,
            attackType: 'fire',
            fame: 7,
            icon: '🐲',
            type: 'draconum',
            color: '#dc2626'
        } : {
            id: `labyrinth_orc_${Date.now()}`,
            name: 'Minotaurus',
            armor: 5,
            attack: 6,
            fame: 4,
            icon: '🐮',
            type: 'orc_khan',
            color: '#16a34a'
        });

        const msg = `Du betrittst das Labyrinth... ${enemies.length} Feinde blockieren den Weg!`;
        this.game.addLog(msg, 'warning');
        this.game.combatOrchestrator.initiateCombat(enemies);
        return { success: true, message: 'Labyrinth betreten!' };
    }
}