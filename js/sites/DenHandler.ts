import { BaseSiteHandler, SiteOption } from './BaseSiteHandler';

export class DenHandler extends BaseSiteHandler {
    public override getOptions(site: any, _currentHex: any): SiteOption[] {
        if (site.conquered) {
            return [{
                id: 'claim_spoils',
                label: 'Beute sichern (1 Bewegung)',
                action: () => this.claimSpoils(),
                enabled: this.game.hero.movementPoints >= 1
            }];
        }

        return [{
            id: 'conquer_den',
            label: 'Hort ausheben (Wächter besiegen)',
            action: () => this.attackDen(),
            enabled: true
        }];
    }

    public attackDen(): { success: boolean, message: string } {
        const enemy = {
            name: 'Hort-Wächter',
            armor: 5,
            attack: 4,
            fame: 5,
            icon: '🐺',
            type: 'robber',
            color: '#78716c',
            swift: true
        };

        const msg = `Du willst den Hort ausheben... ${enemy.name} stellt sich dir in den Weg!`;
        this.game.addLog(msg, 'warning');
        this.game.combatOrchestrator.initiateCombat(enemy);
        return { success: true, message: 'Angriff auf Hort!' };
    }

    public claimSpoils(): { success: boolean, message: string } {
        if (this.game.hero.movementPoints < 1) return { success: false, message: 'Zu wenig Bewegung.' };

        const fameGain = 2;
        const influenceGain = 3;

        this.game.hero.gainFame(fameGain);
        this.game.hero.influencePoints += influenceGain;
        this.game.hero.movementPoints -= 1;

        const msg = `Du hast den Hort ausgehebt: +${fameGain} Ruhm, +${influenceGain} Einfluss!`;
        this.game.addLog(msg, 'success');

        return { success: true, message: msg };
    }
}
