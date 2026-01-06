import { BaseSiteHandler } from './BaseSiteHandler.js';

export class MineHandler extends BaseSiteHandler {
    getOptions(site, currentHex) {
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

    attackMine() {
        const isDeep = Math.random() > 0.6;
        const enemy = isDeep ? {
            name: 'Minen-Aufseher',
            armor: 5,
            attack: 5,
            fame: 5,
            icon: '👺', // Goblin/Orc
            type: 'orc_summoner', // Why not?
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
        this.game.initiateCombat(enemy);
        return { success: true, message: 'Angriff auf Mine!' };
    }

    collectMineCrystal(currentHex) {
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
