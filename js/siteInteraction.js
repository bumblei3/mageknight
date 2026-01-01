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
        const enemy = {
            name: 'Festungswache',
            armor: 6,
            attack: 4,
            fame: 5,
            icon: '🛡️',
            type: 'keep_guard',
            color: '#9ca3af'
        };

        const msg = `Kampf gegen ${this.currentSite.name || 'die Festung'} gestartet!`;
        this.game.addLog(msg, 'warning');
        this.game.initiateCombat(enemy);
        return { success: true, message: 'Angriff auf die Festung!' };
    }
}
