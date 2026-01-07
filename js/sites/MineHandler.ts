import { BaseSiteHandler, SiteOption } from './BaseSiteHandler';

export class MineHandler extends BaseSiteHandler {
    public override getOptions(site: any, currentHex: any): SiteOption[] {
        if (site.conquered) {
            return [{
                id: 'collect_crystal',
                label: 'Kristall abbauen (1 Bewegung)',
                action: () => this.collectMineCrystal(currentHex),
                enabled: this.game.hero.movementPoints >= 1
            }];
        }

        return [{
            id: 'conquer_mine',
            label: 'Mine erobern (Wächter besiegen)',
            action: () => this.attackMine(),
            enabled: true
        }];
    }

    public attackMine(): { success: boolean, message: string } {
        const isDeep = Math.random() > 0.6;
        const enemy = isDeep ? {
            name: 'Minen-Aufseher',
            armor: 5,
            attack: 5,
            fame: 5,
            icon: '👺',
            type: 'orc_summoner',
            color: '#b91c1c'
        } : {
            name: 'Kristall-Wächter',
            armor: 4,
            attack: 3,
            fame: 3,
            icon: '💎',
            type: 'golem_small',
            color: '#0891b2',
            physicalResist: true
        };

        const msg = `Du willst die Mine erobern... ${enemy.name} stellt sich dir in den Weg!`;
        this.game.addLog(msg, 'warning');
        this.game.combatOrchestrator.initiateCombat(enemy);
        return { success: true, message: 'Angriff auf Mine!' };
    }

    public collectMineCrystal(currentHex: any): { success: boolean, message: string } {
        if (this.game.hero.movementPoints < 1) return { success: false, message: 'Zu wenig Bewegung.' };

        // Simplification: Random basic color.
        const colors = ['red', 'green', 'blue', 'white'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        this.game.hero.gainCrystal(color);
        this.game.hero.movementPoints -= 1;

        const msg = `Du hast einen ${color.toUpperCase()}-Kristall abgebaut!`;
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
