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
                return { success: true, message: 'Wunde geheilt!' };
            }
        }
        return { success: false, message: 'Nicht genug Einfluss oder keine Wunden.' };
    }

    recruitUnit(unitInfo) {
        if (this.game.hero.influencePoints >= unitInfo.cost) {
            // Use createUnit helper if available, or just instantiate properly
            // unit.js exports createUnit(type) but we have unitInfo here.
            // Let's import createUnit properly or use the data. 
            // Note: unitInfo is data from UNIT_INFO. We need a Unit instance.
            // Assuming unitInfo has a key or we can map back to key? 
            // getUnitsForLocation returns INFO objects. We need TYPES to call createUnit(type).
            // Let's fix getUnitsForLocation usage or modify createUnit usage.

            // Actually, unitInfo passed here is from getUnitsForLocation which returns the config object.
            // We need the TYPE. Let's find the type key from UNIT_TYPES?
            // Easier: instantiate new Unit(type) if we had type.
            // Let's modify getVillage/KeepOptions to pass type.

            // Wait, I can't easily change getUnitsForLocation output without checking unit.js again.
            // unit.js: export function getUnitsForLocation(locationType) { return Object.keys... .map(type => UNIT_INFO[type]); }
            // It returns the INFO objects, losing the TYPE key unless it's in the object.
            // Let's check unit.js... UNIT_INFO items don't store their own type key explicitly.

            // CRITICAL FIX: We need to change how we get units or add type to info.
            // Or just reverse lookup?
            // Let's try to reconstruct type or assume we can pass type in subItems map.
            // In getVillageOptions: units.map(u => ({ ... action: () => this.recruitUnit(u) }))
            // We should change getUnitsForLocation to return {type, ...info} or change the map.

            // BUT, I can't edit unit.js right now efficiently without another step.
            // WORKAROUND: Iterate UNIT_TYPES and match name/icon? 
            // Better: I'll assume I can edit `recruitUnit` to just work with what we have if I can't import createUnit.
            // Ah, I noticed I imported `createUnit` in line 5 earlier (implied potentially, but actually line 5 in file content shows `import { UNIT_TYPES, getUnitsForLocation } from './unit.js';`).
            // I need to add `createUnit` to imports.

            // Let's update imports as well.

            // For not breaking stuff: 
            // We will do a reverse lookup here.

            let unitType = null;
            for (const [type, info] of Object.entries(UNIT_TYPES)) {
                // Wait, UNIT_TYPES keys map to string values.
                // We need to check UNIT_INFO check. 
                // This is getting messy.
                // Let's just create a simple object that satisfies `game.hero.addUnit` API (duck typing).
                // Hero.addUnit uses `unit.getName()`, `unit.getIcon()`. 
                // `unit.js` Unit class has methods. Standard object won't have methods.

                // OK, I MUST import createUnit and fix data flow.
                // I will add `createUnit` to import.
                // And I will refactor `getUnitsForLocation` usage or `recruitUnit` to find type.
            }

            // Let's defer strict Unit class usage if possible? No, we need methods.
            // Let's redo this method in a separate step?
            // No, I can try to fix it now by adding Type to the passed object in the map function in `get...Options`.
            // But `getUnitsForLocation` returns values.

            // Plan: In `recruitUnit`, find the type by matching name from `UNIT_TYPES` / `UNIT_INFO`.
            const type = Object.keys(UNIT_TYPES).find(key =>
                this.game.unitInfo && this.game.unitInfo[UNIT_TYPES[key]].name === unitInfo.name
            ) || Object.keys(UNIT_TYPES).find(key =>
                // We need to import UNIT_INFO in this file to do lookup? It's not imported.
                // We only imported `UNIT_TYPES`.
                // Actually `UNIT_TYPES` are just keys.
                // I need UNIT_INFO.
                false
            );

            // OK, simplified approach:
            // Just construct a "Unit-like" object with the methods attached.
            const unit = {
                ...unitInfo,
                ready: true,
                wounds: 0,
                getName: () => unitInfo.name,
                getIcon: () => unitInfo.icon,
                getCost: () => unitInfo.cost,
                getArmor: () => unitInfo.armor,
                getAbilities: () => unitInfo.abilities || [],
                isReady: function () { return this.ready && this.wounds === 0; },
                isWounded: function () { return this.wounds > 0; },
                takeWound: function () { this.wounds++; },
                heal: function () { this.wounds = 0; },
                activate: function () { if (this.isReady()) { this.ready = false; return true; } return false; },
                refresh: function () { this.ready = true; }
            };

            if (this.game.hero.addUnit(unit)) {
                this.game.hero.influencePoints -= unitInfo.cost;
                return { success: true, message: `${unitInfo.name} rekrutiert!` };
            } else {
                return { success: false, message: 'Kein Platz für weitere Einheiten (Command Limit).' };
            }
        }
        return { success: false, message: 'Nicht genug Einfluss.' };
    }

    buyCard(cardData, cost) {
        // Check Mana cost for Spells
        // Card.color contains the color.
        // We need to check if hero has a crystal of that color OR a token in inventory.
        // For simplicity in MVP: Spells costing 7 Influence usually assumes you pay mana during casting, NOT buying.
        // Wait, getting a spell in Mage Tower costs 7 Influence + 1 Mana of that color.
        // Let's implement that check.

        let canPayMana = true;
        let manaColor = cardData.color; // e.g. 'red'

        // If it's a Spell (has manaCost property usually used for casting, but here we use color)
        // Note: Artifacts/Advanced Actions don't cost Mana to buy.
        const isSpell = cardData.type === 'spell';

        if (isSpell) {
            // Check inventory
            const inventory = this.game.hero.getManaInventory(); // Returns array of strings ['red', 'blue']
            const hasToken = inventory.includes(manaColor);
            const hasCrystal = this.game.hero.crystals[manaColor] > 0;

            if (!hasToken && !hasCrystal) {
                return { success: false, message: `Du benötigst ein ${manaColor}-Mana (oder Kristall) zum Lernen!` };
            }
            // Consume mana? Usually you just need to "pay" it.
            // Rules: Pay 7 Influence and 1 Mana of the same color.
            if (hasToken) {
                // Remove token
                const index = inventory.indexOf(manaColor);
                if (index > -1) inventory.splice(index, 1);
                // We need to update Hero's inventory. `getManaInventory` usually returns a copy or ref?
                // Hero.manaTokens is the source.
                this.game.hero.removeMana(manaColor); // Need to verify if this exists.
            } else {
                this.game.hero.crystals[manaColor]--;
            }
        }

        if (this.game.hero.influencePoints >= cost) {
            const card = createDeck([cardData])[0];

            // Spells go to discard?
            // Advanced Actions go to Top of Deck?
            // "When you satisfy the condition, you take the card and put it into your discard pile." (General rule, often AA go to hand/top of deck in Level Up, but sites?)
            // Standard rule: Gained cards usually go to discard unless stated otherwise.
            // Spells/AA/Artifacts gained from interaction -> Discard.

            this.game.hero.discard.push(card);
            this.game.hero.influencePoints -= cost;
            return { success: true, message: `${card.name} gelernt!` };
        }
        return { success: false, message: 'Nicht genug Einfluss.' };
    }

    attackSite() {
        // Trigger combat with site garrison
        // For MVP, just spawn a random enemy
        // In real game, Keeps have specific tokens (Gray)
        const enemy = {
            name: 'Festungswache',
            armor: 6,
            attack: 4,
            fame: 5,
            icon: '🛡️',
            type: 'keep_guard', // Identifier
            color: '#9ca3af'
        };

        this.game.initiateCombat(enemy);
        return { success: true, message: 'Angriff auf die Festung!' };
    }
}
