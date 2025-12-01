// Hero class for Mage Knight

import { createDeck, shuffleDeck, createWoundCard, GOLDYX_STARTER_DECK } from './card.js';
import { MANA_COLORS } from './mana.js';
import { SKILLS } from './skills.js';

// Fame thresholds for levels
// Level 1 starts at 0
// Level 2: 10 Fame (Reward: Skill + Advanced Action)
// Level 3: 30 Fame (Reward: Command Token + Skill)
// Level 4: 60 Fame (Reward: Advanced Action + Skill)
// Level 5: 100 Fame (Reward: Command Token + Skill)
export const LEVEL_TABLE = [
    { level: 1, fame: 0 },
    { level: 2, fame: 10, reward: 'skill_card' },
    { level: 3, fame: 30, reward: 'unit_skill' },
    { level: 4, fame: 60, reward: 'skill_card' },
    { level: 5, fame: 100, reward: 'unit_skill' }
];

export class Hero {
    constructor(name, startingPosition = { q: 0, r: 0 }) {
        this.name = name;
        this.position = startingPosition;
        this.displayPosition = { ...startingPosition };

        // Stats
        this.level = 1;
        this.armor = 2;
        this.handLimit = 5;
        this.fame = 0;
        this.reputation = 0;
        this.commandLimit = 1; // Start with 1 unit slot
        this.skills = [];

        // Cards
        this.deck = [];
        this.hand = [];
        this.discard = [];
        this.wounds = [];

        // Units
        this.units = [];

        // Resources
        this.crystals = {
            red: 0,
            blue: 0,
            white: 0,
            green: 0
        };
        this.tempMana = []; // Temporary mana for this turn (from dice)

        // Turn state
        this.movementPoints = 0;
        this.attackPoints = 0;
        this.blockPoints = 0;
        this.influencePoints = 0;
        this.healingPoints = 0;

        // Initialize deck
        this.initializeDeck();
    }

    initializeDeck() {
        // Create Goldyx starter deck
        this.deck = shuffleDeck(createDeck(GOLDYX_STARTER_DECK));
        this.hand = [];
        this.discard = [];
    }

    // Draw cards up to hand limit
    drawCards(count = null) {
        const cardsToDraw = count !== null ? count : (this.handLimit - this.hand.length);
        const drawnCards = [];

        for (let i = 0; i < cardsToDraw; i++) {
            const card = this.drawCard();
            if (card) {
                drawnCards.push(card);
            }
        }

        return drawnCards;
    }

    // Draw a single card
    drawCard() {
        // If deck is empty, shuffle discard into deck
        if (this.deck.length === 0 && this.discard.length > 0) {
            this.deck = shuffleDeck([...this.discard]);
            this.discard = [];
        }

        // Draw from deck
        if (this.deck.length > 0) {
            const card = this.deck.pop();
            this.hand.push(card);
            return card;
        }

        return null;
    }

    // Play a card from hand
    playCard(cardIndex, useStrong = false) {
        if (cardIndex < 0 || cardIndex >= this.hand.length) {
            return null;
        }

        const card = this.hand.splice(cardIndex, 1)[0];

        // If using strong effect, check and spend mana
        if (useStrong && card.manaCost > 0) {
            const success = this.spendMana(card.color);
            if (!success) {
                // Couldn't spend mana, fallback to basic
                useStrong = false;
            }
        }

        const effect = card.getEffect(useStrong);

        // Apply effects
        if (effect.movement) this.movementPoints += effect.movement;
        if (effect.attack) this.attackPoints += effect.attack;
        if (effect.block) this.blockPoints += effect.block;
        if (effect.influence) this.influencePoints += effect.influence;
        if (effect.healing) this.healingPoints += effect.healing;

        // Add card to discard pile
        this.discard.push(card);

        return { card, effect, usedStrong: useStrong };
    }

    // Play card sideways for +1 movement/attack/block/influence
    playCardSideways(cardIndex, effectType) {
        if (cardIndex < 0 || cardIndex >= this.hand.length) {
            return null;
        }

        const card = this.hand[cardIndex];
        if (!card.canPlaySideways()) {
            return null;
        }

        this.hand.splice(cardIndex, 1);

        const effects = {
            movement: () => this.movementPoints += 1,
            attack: () => this.attackPoints += 1,
            block: () => this.blockPoints += 1,
            influence: () => this.influencePoints += 1
        };

        if (effects[effectType]) {
            effects[effectType]();
        }

        // Add card to discard pile
        this.discard.push(card);

        return { card, effect: { [effectType]: 1 } };
    }

    // Discard a card
    discardCard(cardIndex) {
        if (cardIndex >= 0 && cardIndex < this.hand.length) {
            const card = this.hand.splice(cardIndex, 1)[0];
            this.discard.push(card);
            return card;
        }
        return null;
    }

    // Rest - discard selected cards and draw new ones (no mana refresh)
    rest(cardIndices = []) {
        // Sort indices in descending order to avoid shifting issues
        const sortedIndices = [...cardIndices].sort((a, b) => b - a);

        // Discard selected cards
        const discardedCards = [];
        for (const index of sortedIndices) {
            const card = this.discardCard(index);
            if (card) {
                discardedCards.push(card);
            }
        }

        // Draw new cards up to hand limit
        this.drawCards();

        return discardedCards;
    }

    // End turn - discard hand and draw new cards
    endTurn() {
        // Move hand to discard
        this.discard.push(...this.hand);
        this.hand = [];

        // Reset turn resources
        this.movementPoints = 0;
        this.attackPoints = 0;
        this.blockPoints = 0;
        this.influencePoints = 0;
        this.healingPoints = 0;

        // Clear temporary mana
        this.clearTempMana();

        // Draw new hand
        this.drawCards();
    }

    // Take a wound
    takeWound() {
        const wound = createWoundCard();
        this.hand.push(wound);
        this.wounds.push(wound);
    }

    // Heal a wound
    healWound(useHealingPoints = true) {
        if (this.wounds.length === 0) {
            return false;
        }

        // Check if healingPoints required and available
        if (useHealingPoints && this.healingPoints <= 0) {
            return false;
        }

        const woundIndex = this.hand.findIndex(card => card.isWound());
        if (woundIndex !== -1) {
            this.hand.splice(woundIndex, 1);
            this.wounds.pop();
            if (useHealingPoints) {
                this.healingPoints--;
            }
            return true;
        }

        return false;
    }

    // Move hero to new position
    moveTo(q, r, cost = 0) {
        if (this.movementPoints >= cost) {
            this.position = { q, r };
            this.movementPoints -= cost;
            return true;
        }
        return false;
    }

    // Gain fame
    gainFame(amount) {
        this.fame += amount;

        // Check for level up
        const nextLevel = LEVEL_TABLE.find(l => l.level === this.level + 1);
        if (nextLevel && this.fame >= nextLevel.fame) {
            return { leveledUp: true, newLevel: nextLevel.level, reward: nextLevel.reward };
        }
        return { leveledUp: false };
    }

    // Level Up
    levelUp() {
        this.level++;
        // Stat increases based on level could go here
        // For now, rewards are handled by Game controller
        if (this.level % 2 === 1) {
            // Odd levels (3, 5) give Command Token (Command Limit +1)
            this.commandLimit++;
            this.armor++; // Bonus armor at higher levels
        } else {
            // Even levels (2, 4) give Hand Limit +1 (simplified)
            this.handLimit++;
        }
    }

    // Add Skill
    addSkill(skill) {
        this.skills.push(skill);

        // Apply passive effects immediately if needed
        if (skill.id === 'dragon_scales') {
            this.armor += 1;
        }
    }

    // Change reputation
    changeReputation(amount) {
        this.reputation += amount;
        // Clamp between -7 and +7
        this.reputation = Math.max(-7, Math.min(7, this.reputation));
    }

    // Get reputation modifier for influence
    getReputationModifier() {
        if (this.reputation >= 3) return 2;
        if (this.reputation >= 1) return 1;
        if (this.reputation <= -5) return -2;
        if (this.reputation <= -2) return -1;
        return 0;
    }

    // Reset hero for new game
    reset() {
        this.position = { q: 0, r: 0 };
        this.fame = 0;
        this.reputation = 0;
        this.movementPoints = 0;
        this.attackPoints = 0;
        this.blockPoints = 0;
        this.influencePoints = 0;
        this.healingPoints = 0;
        this.healingPoints = 0;
        this.wounds = [];
        this.units = [];
        this.initializeDeck();
        this.drawCards();
    }

    // Prepare for new round (shuffle discard into deck)
    prepareNewRound() {
        if (this.discard.length > 0) {
            this.deck = shuffleDeck([...this.deck, ...this.discard]);
            this.discard = [];
        } else if (this.deck.length > 0) {
            this.deck = shuffleDeck(this.deck);
        }
        // Note: Hand is already discarded by endTurn before this is called?
        // In game.js: hero.endTurn() (discards hand) -> check deck empty -> prepareNewRound
        // So yes, discard contains everything.
    }

    // Get current stats
    getStats() {
        return {
            name: this.name,
            level: this.level,
            armor: this.armor,
            handLimit: this.handLimit,
            fame: this.fame,
            reputation: this.reputation,
            wounds: this.wounds.length,
            deckSize: this.deck.length,
            handSize: this.hand.length,
            handSize: this.hand.length,
            discardSize: this.discard.length,
            units: this.units.length,
            commandLimit: this.commandLimit,
            skills: this.skills
        };
    }

    // Unit Management
    addUnit(unit) {
        if (this.units.length < this.commandLimit) {
            this.units.push(unit);
            return true;
        }
        return false;
    }

    removeUnit(index) {
        if (index >= 0 && index < this.units.length) {
            return this.units.splice(index, 1)[0];
        }
        return null;
    }

    getUnits() {
        return this.units;
    }

    // Refresh units at end of round (or specific condition)
    refreshUnits() {
        this.units.forEach(unit => unit.refresh());
    }

    // Recruit a unit (deducts influence)
    recruitUnit(unit, influenceCost) {
        if (this.units.length >= this.commandLimit) {
            return { success: false, message: 'Kein Platz für weitere Einheiten.' };
        }

        // Check influence (assuming influencePoints are used for this turn)
        // In Mage Knight, recruiting usually uses Influence points generated by cards.
        if (this.influencePoints < influenceCost) {
            return { success: false, message: 'Nicht genug Einfluss.' };
        }

        this.influencePoints -= influenceCost;
        this.units.push(unit);
        return { success: true, message: `${unit.getName()} rekrutiert!` };
    }

    // Learn a spell (adds to deck)
    learnSpell(spellCard, influenceCost) {
        if (this.influencePoints < influenceCost) {
            return { success: false, message: 'Nicht genug Einfluss.' };
        }

        this.influencePoints -= influenceCost;
        // Spells usually go to top of deck or discard depending on source, 
        // simplified: add to discard for now (standard for gaining cards)
        this.discard.push(spellCard);
        return { success: true, message: `${spellCard.name} gelernt!` };
    }

    // Learn Advanced Action
    learnAdvancedAction(actionCard, influenceCost) {
        if (this.influencePoints < influenceCost) {
            return { success: false, message: 'Nicht genug Einfluss.' };
        }

        this.influencePoints -= influenceCost;
        this.discard.push(actionCard);
        return { success: true, message: `${actionCard.name} gelernt!` };
    }

    // ===== MANA MANAGEMENT =====

    // Take mana from source (dice)
    takeManaFromSource(color) {
        if (!Object.values(MANA_COLORS).includes(color)) {
            return false;
        }
        this.tempMana.push(color);
        return true;
    }

    // Check if hero has required mana color
    hasMana(requiredColor) {
        if (!requiredColor) return false;
        // Gold can substitute any color
        return this.tempMana.some(m =>
            m === requiredColor || m === MANA_COLORS.GOLD
        );
    }

    // Check if hero can afford card's mana cost
    canAffordMana(card) {
        if (!card.manaCost || card.manaCost === 0) return true;

        // For simplicity: need 1 mana matching card color (or gold)
        return this.hasMana(card.color);
    }

    // Spend mana for a card (prefer exact match, fallback to gold)
    spendMana(requiredColor) {
        if (!requiredColor) return false;

        // Try exact match first
        let index = this.tempMana.indexOf(requiredColor);

        // Fallback to gold wildcard
        if (index === -1) {
            index = this.tempMana.indexOf(MANA_COLORS.GOLD);
        }

        if (index !== -1) {
            this.tempMana.splice(index, 1);
            return true;
        }

        return false;
    }

    // Clear temporary mana (called at end of turn)
    clearTempMana() {
        this.tempMana = [];
    }

    // Get mana inventory for UI
    getManaInventory() {
        return [...this.tempMana];
    }
}

export default Hero;
