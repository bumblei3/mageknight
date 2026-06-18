import { BaseSiteHandler, SiteOption } from './BaseSiteHandler';
import { SITE_TYPES } from '../sites';
import { SiteRewardManager } from './SiteRewards';

export class SpawningGroundsHandler extends BaseSiteHandler {
    public override getOptions(site: any): SiteOption[] {
        if (site.conquered) {
            return [{
                id: 'cleared',
                label: 'Brutstätte bereits gesäubert',
                enabled: false,
                action: () => { }
            }];
        }

        return [{
            id: 'attack_spawning',
            label: 'Brutstätte angreifen (Monsterwellen)',
            action: () => this.attackSpawningGrounds(),
            enabled: true
        }];
    }

    public attackSpawningGrounds(): { success: boolean, message: string } {
        const enemies: any[] = [];

        // Enemy 1: Summoner or Queen
        const isQueen = Math.random() > 0.5;
        enemies.push(isQueen ? {
            id: `spawn_queen_${Date.now()}`,
            name: 'Spinnen-Königin',
            armor: 4,
            attack: 4,
            fame: 7,
            icon: '🕷️',
            type: 'spider_queen',
            color: '#059669',
            poison: true,
            summoner: true
        } : {
            id: `spawn_horde_${Date.now()}`,
            name: 'Ork-Horde',
            armor: 3,
            attack: 5,
            fame: 5,
            icon: '👹',
            type: 'orc_horde',
            color: '#16a34a',
            brutal: true
        });

        // Enemy 2: Minion
        enemies.push({
            id: `spawn_minion_${Date.now()}`,
            name: 'Sumpf-Ratte',
            armor: 3,
            attack: 3,
            fame: 2,
            icon: '🐀',
            type: 'rat',
            color: '#a16207',
            swift: true
        });

        const msg = `Die Brutstätte ist voller Monster... Eine Welle von ${enemies.length} Gegnern greift an!`;
        this.game.addLog(msg, 'warning');
        this.game.combatOrchestrator.initiateCombat(enemies, () => this.onCombatEnd(enemies));
        return { success: true, message: 'Brutstätte betreten!' };
    }

    private onCombatEnd(defeatedEnemies: any[]): void {
        // Award rewards for clearing spawning grounds
        const rewardManager = SiteRewardManager.getInstance();
        const rolls = rewardManager.rollRewards('spawning_grounds', 'uncommon', 2);
        const messages = rewardManager.applyRewards(this.game.hero, rolls);
        
        if (messages.length > 0) {
            this.game.addLog(`Belohnung: ${messages.join(', ')}`, 'success');
        }
        
        // Mark as conquered
        // The combatOrchestrator will handle site.conquered = true
    }
}