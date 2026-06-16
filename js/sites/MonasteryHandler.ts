import { BaseSiteHandler, SiteOption } from './BaseSiteHandler';
import { CARD_DEFINITIONS, SAMPLE_ADVANCED_ACTIONS, SAMPLE_ARTIFACTS } from '../card/CardDefinitions';
import { createDeck } from '../card/CardFactory';

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
        const cards = SAMPLE_ADVANCED_ACTIONS;
        options.push({
            id: 'train',
            label: 'Training (Karten kaufen)',
            subItems: cards.map(c => ({
                id: `train_${c.id}`,
                label: c.name,
                type: 'card',
                data: c,
                cost: 6,
                action: () => this.buyCard(c, 6)
            }))
        });

        // Artifact reward
        if (!this.game.hero._inventory?.artifactsClaimed?.monastery) {
            options.push({
                id: 'artifact',
                label: 'Artefakt suchen',
                action: () => this.claimArtifact(),
                enabled: true
            });
        }

        return options;
    }

    private claimArtifact(): { success: boolean, message: string } {
        if (!this.game.hero) return { success: false, message: 'Kein Held vorhanden.' };

        const randomArt = SAMPLE_ARTIFACTS[Math.floor(Math.random() * SAMPLE_ARTIFACTS.length)];
        const card = createDeck([randomArt])[0];
        this.game.hero.discard.push(card);

        // Track claimed
        if (!this.game.hero._inventory.artifactsClaimed) {
            this.game.hero._inventory.artifactsClaimed = {};
        }
        this.game.hero._inventory.artifactsClaimed.monastery = true;

        const msg = `Du hast ein Artefakt gefunden: ${card.name}! Es liegt in deinem Ablagestapel.`;
        this.game.addLog(msg, 'success');
        this.game.showNotification?.(`🏆 ${card.name} gefunden!`, 'success');

        return { success: true, message: msg };
    }
}