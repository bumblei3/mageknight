// Site Interaction Manager
// Handles logic for visiting sites (Villages, Monasteries, etc.)

import { SITE_TYPES } from './sites.js';
import { getUnitsForLocation, createUnit } from './unit.js';
import { SAMPLE_SPELLS, SAMPLE_ADVANCED_ACTIONS, createDeck } from './card.js';

export class SiteInteractionManager {
    constructor(game) {
        this.game = game;
        this.currentSite = null;
        this.currentHex = null;
    }

    // Start interaction with a site
    visitSite(hex, site) {
        this.currentHex = hex;
        this.currentSite = site;

        const interactionData = {
            type: site.type,
            name: site.getName(),
            icon: site.getIcon(),
            color: site.getColor(),
            description: site.getInfo().description,
            options: []
        };

        // Generate options based on site type
        switch (site.type) {
        case SITE_TYPES.VILLAGE:
            interactionData.options = this.getVillageOptions();
            break;
        case SITE_TYPES.MONASTERY:
            interactionData.options = this.getMonasteryOptions();
            break;
        case SITE_TYPES.MAGE_TOWER:
            interactionData.options = this.getMageTowerOptions();
            break;
        case SITE_TYPES.KEEP:
            interactionData.options = this.getKeepOptions();
            break;
        case SITE_TYPES.DUNGEON:
            interactionData.options = this.getDungeonOptions();
            break;
        case SITE_TYPES.CITY:
            interactionData.options = this.getCityOptions();
            break;
        case SITE_TYPES.RUIN:
            interactionData.options = this.getRuinOptions();
            break;
        case SITE_TYPES.TOMB:
            interactionData.options = this.getTombOptions();
            break;
        case SITE_TYPES.LABYRINTH:
            interactionData.options = this.getLabyrinthOptions();
            break;
        case SITE_TYPES.SPAWNING_GROUNDS:
            interactionData.options = this.getSpawningGroundsOptions();
            break;
        case SITE_TYPES.MINE:
            interactionData.options = this.getMineOptions();
            break;
        default:
            interactionData.options = [];
        }

        return interactionData;
    }

    getVillageOptions() {
        const options = [];

        // Healing
        options.push({
            id: 'heal',
            label: 'Heilen (3 Einfluss / Wunde)',
            action: () => this.healWounds(3),
            enabled: this.game.hero.wounds.length > 0
        });

        // Recruitment
        const units = getUnitsForLocation(SITE_TYPES.VILLAGE);
        options.push({
            id: 'recruit',
            label: 'Einheiten rekrutieren',
            subItems: units.map(u => ({
                type: 'unit',
                data: u,
                cost: u.cost,
                action: () => this.recruitUnit(u)
            }))
        });

        return options;
    }

    getMonasteryOptions() {
        const options = [];

        // Healing (Cheaper)
        options.push({
            id: 'heal',
            label: 'Heilen (2 Einfluss / Wunde)',
            action: () => this.healWounds(2),
            enabled: this.game.hero.wounds.length > 0
        });

        // Training (Advanced Actions)
        const cards = SAMPLE_ADVANCED_ACTIONS; // In real game, draw random
        options.push({
            id: 'train',
            label: 'Training (Karten kaufen)',
            subItems: cards.map(c => ({
                type: 'card',
                data: c,
                cost: 6, // Simplified cost
                action: () => this.buyCard(c, 6)
            }))
        });

        return options;
    }

    getMageTowerOptions() {
        const options = [];

        if (!this.currentSite.conquered) {
            options.push({
                id: 'attack',
                label: 'Magierturm angreifen (Erobern)',
                action: () => this.attackSite(),
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

    getKeepOptions() {
        const options = [];

        if (!this.currentSite.conquered) {
            options.push({
                id: 'attack',
                label: 'Angreifen (Erobern)',
                action: () => this.attackSite(),
                enabled: true
            });
        } else {
            // Recruitment
            const units = getUnitsForLocation(SITE_TYPES.KEEP);
            options.push({
                id: 'recruit',
                label: 'Einheiten rekrutieren',
                subItems: units.map(u => ({
                    type: 'unit',
                    data: u,
                    cost: u.cost,
                    action: () => this.recruitUnit(u)
                }))
            });
        }
        return options;
    }

    getDungeonOptions() {
        if (this.currentSite.conquered) {
            return [{
                id: 'looted',
                label: 'Verlies bereits geplündert',
                enabled: false,
                action: () => { }
            }];
        }

        return [{
            id: 'explore_dungeon',
            label: 'Verlies erkunden (Gefährlicher Kampf)',
            action: () => this.exploreDungeon(),
            enabled: true
        }];
    }

    getRuinOptions() {
        if (this.currentSite.conquered) {
            return [{
                id: 'looted',
                label: 'Ruine bereits geplündert',
                enabled: false,
                action: () => { }
            }];
        }

        return [{
            id: 'explore_ruin',
            label: 'Ruine erkunden (Herausfordernder Kampf)',
            action: () => this.exploreRuin(),
            enabled: true
        }];
    }

    getTombOptions() {
        if (this.currentSite.conquered) {
            return [{
                id: 'looted',
                label: 'Grabstätte bereits geplündert',
                enabled: false,
                action: () => { }
            }];
        }

        return [{
            id: 'explore_tomb',
            label: 'Grabstätte erkunden (Untote Gegner)',
            action: () => this.exploreTomb(),
            enabled: true
        }];
    }

    getLabyrinthOptions() {
        if (this.currentSite.conquered) {
            return [{
                id: 'looted',
                label: 'Labyrinth bereits durchquert',
                enabled: false,
                action: () => { }
            }];
        }

        return [{
            id: 'explore_labyrinth',
            label: 'Labyrinth betreten (Mehrere Kämpfe)',
            action: () => this.exploreLabyrinth(),
            enabled: true
        }];
    }

    getSpawningGroundsOptions() {
        if (this.currentSite.conquered) {
            return [{
                id: 'looted',
                label: 'Brutstätte bereits gesäubert',
                enabled: false,
                action: () => { }
            }];
        }

        return [{
            id: 'explore_spawning',
            label: 'Brutstätte angreifen (Monsterwellen)',
            action: () => this.exploreSpawningGrounds(),
            enabled: true
        }];
    }

    getCityOptions() {
        const options = [];

        // Expensive Healing
        options.push({
            id: 'heal',
            label: 'Heilen (4 Einfluss / Wunde)',
            action: () => this.healWounds(4),
            enabled: this.game.hero.wounds.length > 0
        });

        // Elite Units
        const units = getUnitsForLocation(SITE_TYPES.CITY);
        options.push({
            id: 'recruit_elite',
            label: 'Elite-Einheiten rekrutieren',
            subItems: units.length > 0 ? units.map(u => ({
                type: 'unit',
                data: u,
                cost: u.cost,
                action: () => this.recruitUnit(u)
            })) : [{ label: 'Keine Einheiten verfügbar', enabled: false }]
        });

        // Spells
        const spells = SAMPLE_SPELLS;
        options.push({
            id: 'city_spells',
            label: 'Zauber im Laden (8 Einfluss + Mana)',
            subItems: spells.map(c => ({
                type: 'card',
                data: c,
                cost: 8,
                manaCost: c.color,
                action: () => this.buyCard(c, 8)
            }))
        });

        return options;
    }

    getMineOptions() {
        if (this.currentSite.conquered) {
            // Production: Collect Crystal (Once per turn? Or passive?)
            // Rules: You own it. Usually passive +1 Crystal income. Or visit to collect.
            // Impl: Visit to collect 1 Crystal of mine color.
            return [{
                id: 'collect_crystal',
                label: 'Kristall abbauen (1 Bewegung)',
                action: () => this.collectMineCrystal(),
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

    // Actions
    attackMine() {
        // Mines are guarded by Orcs or Draconum depending on depth/color
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

    collectMineCrystal() {
        if (this.game.hero.movementPoints < 1) return { success: false, message: 'Zu wenig Bewegung.' };

        // Random color or site color? Sites usually have fixed color.
        // We defined site.getBlockRequirement or logic for color elsewhere?
        // Abstract site doesn't store color unless we set it.
        // Let's assume random for now or based on terrain.
        // Simplification: Random basic color.

        const colors = ['red', 'green', 'blue', 'white'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        this.game.hero.gainCrystal(color);
        this.game.hero.movementPoints -= 1;

        const msg = `Du hast einen ${color.toUpperCase()}-Kristall abgebaut!`;
        this.game.addLog(msg, 'success');
        this.game.particleSystem.buffEffect(
            this.game.hexGrid.axialToPixel(this.currentHex.q, this.currentHex.r).x,
            this.game.hexGrid.axialToPixel(this.currentHex.q, this.currentHex.r).y,
            color
        );

        return { success: true, message: msg };
    }

    // Actions
    healWounds(costPerWound) {
        // Simplified: Heal 1 wound for cost
        if (this.game.hero.influencePoints >= costPerWound && this.game.hero.wounds.length > 0) {
            // Need to remove wound from hand OR discard
            // Hero.healWound() handles this
            if (this.game.hero.healWound(false)) {  // Don't use healingPoints, using influence instead
                this.game.hero.influencePoints -= costPerWound;
                const msg = 'Wunde geheilt!';
                this.game.addLog(msg, 'success');
                return { success: true, message: msg };
            }
        }
        return { success: false, message: 'Nicht genug Einfluss oder keine Wunden.' };
    }

    recruitUnit(unitInfo) {
        if (this.game.hero.influencePoints >= unitInfo.cost) {
            // Use proper createUnit factory if available, or construct from unitInfo
            const instance = unitInfo.create ? unitInfo.create() : createUnit(unitInfo.type);

            if (!instance) {
                return { success: false, message: 'Einheiten-Typ unbekannt.' };
            }

            // Ensure ID is unique
            instance.id = `${unitInfo.type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            if (this.game.hero.addUnit(instance)) {
                this.game.hero.influencePoints -= unitInfo.cost;
                const msg = `Einheit ${instance.name || instance.getName()} rekrutiert!`;
                this.game.addLog(msg, 'success');
                this.game.updateStats();
                return { success: true, message: msg };
            } else {
                return { success: false, message: 'Kein Platz für weitere Einheiten (Command Limit).' };
            }
        }
        return { success: false, message: 'Nicht genug Einfluss.' };
    }

    buyCard(cardData, cost) {
        // Check Mana cost for Spells
        let manaColor = cardData.color;
        const isSpell = cardData.type === 'spell';

        if (isSpell) {
            const inventory = this.game.hero.getManaInventory();
            const hasToken = inventory.includes(manaColor);
            const hasCrystal = this.game.hero.crystals[manaColor.toUpperCase()] > 0 || this.game.hero.crystals[manaColor.toLowerCase()] > 0;

            if (!hasToken && !hasCrystal) {
                return { success: false, message: `Du benötigst ein ${manaColor}-Mana (oder Kristall) zum Lernen!` };
            }

            if (hasToken) {
                this.game.hero.removeMana(manaColor);
            } else {
                const cryKey = this.game.hero.crystals[manaColor.toUpperCase()] !== undefined ? manaColor.toUpperCase() : manaColor.toLowerCase();
                this.game.hero.crystals[cryKey]--;
            }
        }

        if (this.game.hero.influencePoints >= cost) {
            const card = createDeck([cardData])[0];
            this.game.hero.discard.push(card);
            this.game.hero.influencePoints -= cost;
            const msg = `Karte ${card.name} gelernt!`;
            this.game.addLog(msg, 'success');
            return { success: true, message: msg };
        }
        return { success: false, message: 'Nicht genug Einfluss.' };
    }

    attackSite() {
        const isMageTower = this.currentSite.type === 'mage_tower';
        const enemy = {
            name: isMageTower ? 'Wächter des Turms' : 'Festungswache',
            armor: isMageTower ? 5 : 6,
            attack: isMageTower ? 5 : 4,
            fame: isMageTower ? 6 : 5,
            icon: isMageTower ? '🧙' : '🛡️',
            type: isMageTower ? 'tower_guard' : 'keep_guard',
            color: isMageTower ? '#8b5cf6' : '#9ca3af',
            fortified: true, // Always fortified in sites
            attackType: isMageTower ? 'fire' : 'physical'
        };

        const msg = `Kampf gegen ${this.currentSite.getName()} gestartet! Du musst die Befestigung überwinden.`;
        this.game.addLog(msg, 'warning');
        this.game.initiateCombat(enemy);
        return { success: true, message: 'Direkter Angriff!' };
    }

    exploreDungeon() {
        // Create an elemental or draconum for the dungeon
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
        this.game.initiateCombat(enemy);
        return { success: true, message: 'Verlies betreten!' };
    }

    exploreRuin() {
        // Ruins often have regular enemies but they are fortified
        // Or sometimes they have summoners
        const isSummoner = Math.random() > 0.4;
        const enemy = isSummoner ? {
            name: 'Ruinen-Beschwörer',
            armor: 4,
            attack: 3,
            fame: 5,
            icon: '💀',
            type: 'necromancer', // This will trigger summoner logic
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
        this.game.initiateCombat(enemy);
        return { success: true, message: 'Ruine betreten!' };
    }

    exploreTomb() {
        // Tombs have undead enemies - vampires, phantoms, or liches
        const roll = Math.random();
        let enemy;
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

    exploreLabyrinth() {
        // Labyrinths have multiple enemies (2x)
        // Mix of Magic (Mage/Golem) and Dungeon (Draconum/Elemental)
        const enemies = [];

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
            name: 'Minotaurus', // Flavor text for Orc
            armor: 5,
            attack: 6,
            fame: 4,
            icon: '🐮',
            type: 'orc_khan',
            color: '#16a34a'
        });

        const msg = `Du betrittst das Labyrinth... ${enemies.length} Feinde blockieren den Weg!`;
        this.game.addLog(msg, 'warning');

        // Pass array instead of single object
        this.game.initiateCombat(enemies);
        return { success: true, message: 'Labyrinth betreten!' };
    }

    exploreSpawningGrounds() {
        // Spawning Grounds have swarms (2x)
        const enemies = [];

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
        this.game.initiateCombat(enemies);
        return { success: true, message: 'Brutstätte betreten!' };
    }
}
