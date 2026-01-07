import { BaseSiteHandler, SiteOption } from './BaseSiteHandler';
import { SITE_TYPES } from '../sites';

export class ExplorationHandler extends BaseSiteHandler {
    public override getOptions(site: any): SiteOption[] {
        if (site.conquered) {
            const labels: Record<string, string> = {
                [SITE_TYPES.DUNGEON]: 'Verlies bereits geplündert',
                [SITE_TYPES.RUINS]: 'Ruine bereits geplündert', // SITE_TYPES.RUINS is likely 'ruins', test expects 'Ruine'
                [SITE_TYPES.TOMB]: 'Grabstätte bereits geplündert',
                [SITE_TYPES.LABYRINTH]: 'Labyrinth bereits durchquert',
                [SITE_TYPES.SPAWNING_GROUNDS]: 'Brutstätte bereits gesäubert'
            };

            return [{
                id: 'looted',
                label: labels[site.type] || 'Bereits erkundet',
                enabled: false,
                action: () => { }
            }];
        }

        // Action Mapping
        const actions: Record<string, { id: string, label: string, handler: () => any }> = {
            [SITE_TYPES.DUNGEON]: {
                id: 'explore_dungeon',
                label: 'Verlies erkunden (Gefährlicher Kampf)',
                handler: () => this.exploreDungeon()
            },
            [SITE_TYPES.RUINS]: {
                id: 'explore_ruin',
                label: 'Ruine erkunden (Herausfordernder Kampf)',
                handler: () => this.exploreRuin()
            },
            [SITE_TYPES.TOMB]: {
                id: 'explore_tomb',
                label: 'Grabstätte erkunden (Untote Gegner)',
                handler: () => this.exploreTomb()
            },
            [SITE_TYPES.LABYRINTH]: {
                id: 'explore_labyrinth',
                label: 'Labyrinth betreten (Mehrere Kämpfe)',
                handler: () => this.exploreLabyrinth()
            },
            [SITE_TYPES.SPAWNING_GROUNDS]: {
                id: 'explore_spawning',
                label: 'Brutstätte angreifen (Monsterwellen)',
                handler: () => this.exploreSpawningGrounds()
            }
        };

        const config = actions[site.type];
        if (config) {
            return [{
                id: config.id,
                label: config.label,
                action: config.handler,
                enabled: true
            }];
        }
        return [];
    }

    public exploreDungeon(): { success: boolean, message: string } {
        const isElemental = Math.random() > 0.5;
        const enemy = isElemental ? {
            name: 'Feuer-Elementar',
            armor: 4,
            attack: 5,
            attackType: 'fire',
            iceResist: true,
            fame: 4,
            icon: '🔥',
            type: 'elemental',
            color: '#ef4444'
        } : {
            name: 'Drakonier-Elite',
            armor: 5,
            attack: 6,
            attackType: 'fire',
            fame: 7,
            icon: '🐲',
            type: 'draconum',
            color: '#dc2626'
        };

        const msg = `Du betrittst das Dunkel... ${enemy.name} greift an!`;
        this.game.addLog(msg, 'warning');
        this.game.combatOrchestrator.initiateCombat(enemy);
        return { success: true, message: 'Verlies betreten!' };
    }

    public exploreRuin(): { success: boolean, message: string } {
        const isSummoner = Math.random() > 0.4;
        const enemy = isSummoner ? {
            name: 'Ruinen-Beschwörer',
            armor: 4,
            attack: 3,
            fame: 5,
            icon: '💀',
            type: 'necromancer',
            summoner: true,
            color: '#7c3aed'
        } : {
            name: 'Ruinen-Wächter',
            armor: 6,
            attack: 4,
            fame: 4,
            icon: '🛡️',
            type: 'ruin_guard',
            color: '#d97706',
            fortified: true
        };

        const msg = `Du untersuchst die Trümmer... ${enemy.name} erscheint!`;
        this.game.addLog(msg, 'warning');
        this.game.combatOrchestrator.initiateCombat(enemy);
        return { success: true, message: 'Ruine betreten!' };
    }

    public exploreTomb(): { success: boolean, message: string } {
        const roll = Math.random();
        let enemy: any;
        if (roll > 0.7) {
            enemy = {
                name: 'Vampir-Lord',
                armor: 5,
                attack: 5,
                fame: 8,
                icon: '🧛',
                type: 'vampire',
                color: '#7c3aed',
                vampiric: true
            };
        } else if (roll > 0.3) {
            enemy = {
                name: 'Phantom',
                armor: 3,
                attack: 4,
                fame: 4,
                icon: '👻',
                type: 'phantom',
                color: '#a855f7',
                physicalResist: true
            };
        } else {
            enemy = {
                name: 'Skelett-Krieger',
                armor: 4,
                attack: 3,
                fame: 3,
                icon: '💀',
                type: 'skeleton',
                color: '#d1d5db'
            };
        }

        const msg = `Die Krypta öffnet sich... ${enemy.name} erhebt sich!`;
        this.game.addLog(msg, 'warning');
        this.game.initiateCombat(enemy);
        return { success: true, message: 'Grabstätte betreten!' };
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

    public exploreSpawningGrounds(): { success: boolean, message: string } {
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
        this.game.combatOrchestrator.initiateCombat(enemies);
        return { success: true, message: 'Brutstätte betreten!' };
    }
}
