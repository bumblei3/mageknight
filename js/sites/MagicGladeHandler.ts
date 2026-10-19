import { BaseSiteHandler, SiteOption } from './BaseSiteHandler';

export class MagicGladeHandler extends BaseSiteHandler {
    public override getOptions(site: any, currentHex: any): SiteOption[] {
        if (site.conquered) {
            return [{
                id: 'channel_mana',
                label: 'Mana kanalisieren (1 Bewegung)',
                action: () => this.channelMana(currentHex),
                enabled: this.game.hero.movementPoints >= 1
            }];
        }

        return [{
            id: 'conquer_glade',
            label: 'Magischen Hain reinigen (Wächter besiegen)',
            action: () => this.attackGlade(),
            enabled: true
        }];
    }

    public attackGlade(): { success: boolean, message: string } {
        const enemy = {
            name: 'Hain-Wächter',
            armor: 4,
            attack: 3,
            fame: 4,
            icon: '🌿',
            type: 'mage',
            color: '#34d399',
            physicalResist: true,
            attackType: 'ice'
        };

        const msg = `Du willst den Magischen Hain reinigen... ${enemy.name} stellt sich dir in den Weg!`;
        this.game.addLog(msg, 'warning');
        this.game.combatOrchestrator.initiateCombat(enemy);
        return { success: true, message: 'Angriff auf Magischen Hain!' };
    }

    public channelMana(currentHex: any): { success: boolean, message: string } {
        if (this.game.hero.movementPoints < 1) return { success: false, message: 'Zu wenig Bewegung.' };

        const colors = ['red', 'green', 'blue', 'white'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        this.game.hero.addMana(color);
        this.game.hero.movementPoints -= 1;

        const msg = `Du hast ${color}-Mana aus dem Hain gekanalisiert!`;
        this.game.addLog(msg, 'success');

        if (currentHex && this.game.particleSystem) {
            this.game.particleSystem.buffEffect(
                this.game.hexGrid.axialToPixel(currentHex.q, currentHex.r).x,
                this.game.hexGrid.axialToPixel(currentHex.q, currentHex.r).y,
                color
            );
        }

        return { success: true, message: msg };
    }
}
