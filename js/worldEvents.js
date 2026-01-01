import { MANA_COLORS } from './constants.js';

export const EVENT_TYPES = {
    SHRINE: 'shrine',
    AMBUSH: 'ambush',
    CACHE: 'cache',
    MERCHANT: 'merchant',
    ANCIENT_TOMB: 'ancient_tomb',
    BANDIT_CAMP: 'bandit_camp'
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
            possibleEvents = [EVENT_TYPES.MERCHANT, EVENT_TYPES.SHRINE, EVENT_TYPES.CACHE, EVENT_TYPES.ANCIENT_TOMB];
        } else {
            possibleEvents = [EVENT_TYPES.AMBUSH, EVENT_TYPES.SHRINE, EVENT_TYPES.CACHE, EVENT_TYPES.BANDIT_CAMP];
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
            case EVENT_TYPES.ANCIENT_TOMB:
                return {
                    type,
                    title: 'Uralte Grabkammer',
                    description: 'Eine vergessene Grabstätte. Wagst du es, sie zu öffnen?',
                    options: [
                        { label: 'Öffnen (Riskiere 1 Wunde für +3 Ruhm)', action: 'tomb_risk', text: 'Du spürst uralte Magie...' },
                        { label: 'Weitergehen', action: 'none', text: 'Besser nicht.' }
                    ]
                };
            case EVENT_TYPES.BANDIT_CAMP:
                return {
                    type,
                    title: 'Banditenlager',
                    description: 'Eine Bande Gesetzloser hat sich hier verschanzt!',
                    options: [
                        { label: 'Angreifen (Kampf für Kristalle)', action: 'fight_bandits', text: 'Du greifst an!' },
                        { label: 'Zurückschleichen', action: 'none', text: 'Du weichst unbemerkt zurück.' }
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
                return { action: 'fight' };
            case 'tomb_risk':
                // 50% chance of wound, always gain fame
                if (Math.random() < 0.5) {
                    this.game.hero.takeWound();
                    this.game.addLog('Eine Falle! Du nimmst eine Wunde.', 'warning');
                } else {
                    this.game.addLog('Du findest antike Schätze!', 'success');
                }
                this.game.hero.gainFame(3);
                this.game.updateStats();
                break;
            case 'fight_bandits':
                return { action: 'fight_bandits' };
            case 'none':
                break;
        }

        return { success: true, message: option.text, action: option.action };

    }
}
