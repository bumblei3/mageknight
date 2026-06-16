import { BaseSiteHandler, SiteOption } from './BaseSiteHandler';
import { CARD_DEFINITIONS, SAMPLE_SPELLS, SAMPLE_ARTIFACTS } from '../card/CardDefinitions';
import { createDeck } from '../card/CardFactory';

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
            const spells = SAMPLE_SPELLS;
            options.push({
                id: 'spells',
                label: 'Zauber lernen (7 Einfluss + Mana)',
                subItems: spells.map(c => ({
                    id: `spell_${c.id}`,
                    label: c.name,
                    type: 'card' as const,
                    data: c,
                    cost: 7,
                    action: () => this.buyCard(c, 7)
                }))
            });

            // Artifact reward (once per conquest)
            if (!site.artifactClaimed) {
                options.push({
                    id: 'artifact',
                    label: 'Artefakt suchen',
                    action: () => this.claimArtifact(site),
                    enabled: true
                });
            }
        }

        return options;
    }

    private claimArtifact(site: any): { success: boolean, message: string } {
        if (!this.game.hero) return { success: false, message: 'Kein Held vorhanden.' };

        // Award random artifact
        const randomArt = SAMPLE_ARTIFACTS[Math.floor(Math.random() * SAMPLE_ARTIFACTS.length)];
        const card = createDeck([randomArt])[0];
        this.game.hero.discard.push(card);

        // Mark as claimed
        site.artifactClaimed = true;

        const msg = `Du hast ein Artefakt gefunden: ${card.name}! Es liegt in deinem Ablagestapel.`;
        this.game.addLog(msg, 'success');
        this.game.showNotification?.(`🏆 ${card.name} gefunden!`, 'success');

        return { success: true, message: msg };
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