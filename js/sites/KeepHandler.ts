import { BaseSiteHandler, SiteOption } from './BaseSiteHandler';
import { SITE_TYPES } from '../sites';
import { getUnitsForLocation } from '../unit';
import { SAMPLE_ARTIFACTS } from '../card/CardDefinitions';
import { createDeck } from '../card/CardFactory';

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

        const randomArt = SAMPLE_ARTIFACTS[Math.floor(Math.random() * SAMPLE_ARTIFACTS.length)];
        const card = createDeck([randomArt])[0];
        this.game.hero.discard.push(card);

        site.artifactClaimed = true;

        const msg = `Du hast ein Artefakt gefunden: ${card.name}! Es liegt in deinem Ablagestapel.`;
        this.game.addLog(msg, 'success');
        this.game.showNotification?.(`🏆 ${card.name} gefunden!`, 'success');

        return { success: true, message: msg };
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
