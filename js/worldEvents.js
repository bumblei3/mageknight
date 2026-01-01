import { MANA_COLORS } from './constants.js';

export const EVENT_TYPES = {
    SHRINE: 'shrine',
    AMBUSH: 'ambush',
    CACHE: 'cache',
    MERCHANT: 'merchant'
};

export class WorldEventManager {
    constructor(game) {
        this.game = game;
    }

    /**
     * Check if an event should occur upon exploration
     * @param {string} terrainType 
     */
    checkForEvent(terrainType) {
        // Base chance 20%
        // Higher in dangerous terrain
        let chance = 0.2;
        if (terrainType === 'wasteland' || terrainType === 'swamp') chance = 0.35;
        if (terrainType === 'plains') chance = 0.15;

        if (Math.random() < chance) {
            return this.generateEvent(terrainType);
        }
        return null;
    }

    generateEvent(terrainType) {
        const types = Object.values(EVENT_TYPES);

        // Weight events based on terrain
        let possibleEvents = [];

        if (terrainType === 'plains' || terrainType === 'hills') {
            possibleEvents = [EVENT_TYPES.MERCHANT, EVENT_TYPES.SHRINE, EVENT_TYPES.CACHE];
        } else {
            possibleEvents = [EVENT_TYPES.AMBUSH, EVENT_TYPES.SHRINE, EVENT_TYPES.CACHE]; // More likely to be bad
        }

        const type = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];

        switch (type) {
            case EVENT_TYPES.SHRINE:
                return {
                    type,
                    title: 'Verlassener Schrein',
                    description: 'Du findest einen alten Schrein.',
                    options: [
                        { label: 'Beten (Heilen)', action: 'heal', value: 1, text: 'Du fühlst dich erfrischt. (Wunde geheilt)' },
                        { label: 'Suchen (Mana)', action: 'mana', value: 'gold', text: 'Du findest einen Gold-Kristall!' } // Simplified
                    ]
                };
            case EVENT_TYPES.AMBUSH:
                return {
                    type,
                    title: 'Hinterhalt!',
                    description: 'Feinde lauern im Schatten!',
                    options: [
                        { label: 'Zum Kampf!', action: 'fight', text: 'Der Kampf beginnt!' }
                    ]
                };
            case EVENT_TYPES.CACHE:
                const randomColor = Object.values(MANA_COLORS)[Math.floor(Math.random() * 6)];
                return {
                    type,
                    title: 'Verstecktes Vorratslager',
                    description: 'Jemand hat hier Vorräte zurückgelassen.',
                    options: [
                        { label: 'Nehmen', action: 'mana', value: randomColor, text: `Du findest einen ${randomColor}-Kristall.` }
                    ]
                };
            case EVENT_TYPES.MERCHANT:
                return {
                    type,
                    title: 'Wandernder Händler',
                    description: 'Ein Händler bietet dir seine Waren an.',
                    options: [
                        { label: 'Kristall kaufen (-2 Ruhm)', action: 'buy_mana', cost: 2, text: 'Du kaufst einen Kristall.' },
                        { label: 'Weitergehen', action: 'none', text: 'Du ziehst weiter.' }
                    ]
                };
            default:
                return null;
        }
    }

    /**
     * Apply the result of an event (called from UI)
     */
    resolveEventOption(event, optionIndex) {
        const option = event.options[optionIndex];
        if (!option) return;

        switch (option.action) {
            case 'heal':
                this.game.hero.healWound(); // Method from Hero or Controller
                this.game.updateStats();
                break;
            case 'mana':
                this.game.manaSource.addCrystalToInventory(option.value);
                this.game.renderMana();
                break;
            case 'buy_mana':
                if (this.game.hero.fame >= 2) {
                    this.game.hero.fame -= 2;
                    const randomColor = Object.values(MANA_COLORS)[Math.floor(Math.random() * 6)];
                    this.game.manaSource.addCrystalToInventory(randomColor);
                    this.game.renderMana();
                    this.game.updateStats();
                } else {
                    return { success: false, message: 'Nicht genug Ruhm!' };
                }
                break;
            case 'fight':
                // Trigger combat somehow or just spawn enemy at location
                // Simplest: Spawn enemy at hero location and trigger combat start
                // But Explore happens in Move logic? 
                // We'll let the Game controller handle the combat trigger part
                return { action: 'fight' };
            case 'none':
                break;
        }

        return { success: true, message: option.text, action: option.action };
    }
}
