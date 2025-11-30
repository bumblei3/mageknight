// Site Interaction Manager
// Handles logic for visiting sites (Villages, Monasteries, etc.)

import { SITE_TYPES } from './sites.js';
import { UNIT_TYPES, getUnitsForLocation } from './unit.js';
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
        return [
            {
                id: 'attack',
                label: 'Angreifen (Erobern)',
                action: () => this.attackSite(),
                enabled: !this.currentSite.conquered
            }
        ];
    }

    // Actions
    healWounds(costPerWound) {
        // Simplified: Heal 1 wound for cost
        if (this.game.hero.influencePoints >= costPerWound && this.game.hero.wounds.length > 0) {
            if (this.game.hero.healWound(false)) {  // Don't use healingPoints, using influence instead
                this.game.hero.influencePoints -= costPerWound;
                return { success: true, message: 'Wunde geheilt!' };
            }
        }
        return { success: false, message: 'Nicht genug Einfluss oder keine Wunden.' };
    }

    recruitUnit(unitInfo) {
        if (this.game.hero.influencePoints >= unitInfo.cost) {
            const unit = { ...unitInfo, ready: true, wounds: 0 }; // Create instance
            // Need proper Unit class instance
            // We should import createUnit from unit.js but for now simple object or fix import
            // Let's assume createUnit is available or we reconstruct it
            // Better: use createUnit from unit.js

            // Check command limit
            if (this.game.hero.addUnit(unit)) { // This adds simple object, Hero.addUnit expects object
                this.game.hero.influencePoints -= unitInfo.cost;
                return { success: true, message: `${unitInfo.name} rekrutiert!` };
            } else {
                return { success: false, message: 'Kein Platz für weitere Einheiten (Command Limit).' };
            }
        }
        return { success: false, message: 'Nicht genug Einfluss.' };
    }

    buyCard(cardData, cost) {
        if (this.game.hero.influencePoints >= cost) {
            const card = createDeck([cardData])[0]; // Create Card instance
            this.game.hero.discard.push(card); // Bought cards go to discard usually (or top of deck)
            // Rules: Advanced actions go to top of deck? Spells to discard?
            // Simplified: To discard.
            this.game.hero.influencePoints -= cost;
            return { success: true, message: `${card.name} gelernt!` };
        }
        return { success: false, message: 'Nicht genug Einfluss.' };
    }

    attackSite() {
        // Trigger combat with site garrison
        // For MVP, just spawn a random enemy
        // In real game, Keeps have specific tokens
        const enemy = {
            name: 'Festungswache',
            armor: 6,
            attack: 4,
            fame: 5,
            icon: '🛡️'
        };

        this.game.initiateCombat(enemy);
        return { success: true, message: 'Angriff auf die Festung!' };
    }
}
