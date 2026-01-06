import { BaseSiteHandler } from './BaseSiteHandler.js';
import { SAMPLE_SPELLS } from '../card.js';

export class MageTowerHandler extends BaseSiteHandler {
    getOptions(site) {
        const options = [];

        if (!site.conquered) {
            options.push({
                id: 'attack',
                label: 'Magierturm angreifen (Erobern)',
                action: () => this.attackSite(site),
                enabled: true
            });
        } else {
            // Spells
            const cards = SAMPLE_SPELLS; // In real game, draw random
            options.push({
                id: 'spells',
                label: 'Zauber lernen (7 Einfluss + Mana)',
                subItems: cards.map(c => ({
                    type: 'card',
                    data: c,
                    cost: 7, // Simplified cost
                    manaCost: c.color, // Need matching mana to buy spell
                    action: () => this.buyCard(c, 7) // Logic for mana check needed
                }))
            });
        }

        return options;
    }

    attackSite(site) {
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
