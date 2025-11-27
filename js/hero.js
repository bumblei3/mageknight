// Hero class for Mage Knight

import { createDeck, shuffleDeck, createWoundCard, GOLDYX_STARTER_DECK } from './card.js';

export class Hero {
    constructor(name, startingPosition = { q: 0, r: 0 }) {
        this.name = name;
        this.position = startingPosition;

        // Stats
        this.level = 1;
        this.armor = 2;
        this.handLimit = 5;
        this.fame = 0;
        this.reputation = 0;

        // Cards
        this.deck = [];
        this.hand = [];
        this.discard = [];
        this.wounds = [];

        // Resources
        this.crystals = {
            red: 0,
            blue: 0,
            white: 0,
            green: 0
        };

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
        const effect = card.getEffect(useStrong);

        // Apply effects
        if (effect.movement) this.movementPoints += effect.movement;
        if (effect.attack) this.attackPoints += effect.attack;
        if (effect.block) this.blockPoints += effect.block;
        if (effect.influence) this.influencePoints += effect.influence;
        if (effect.healing) this.healingPoints += effect.healing;

        // Add card to discard pile
        this.discard.push(card);

        return { card, effect };
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
    healWound() {
        if (this.healingPoints > 0 && this.wounds.length > 0) {
            const woundIndex = this.hand.findIndex(card => card.isWound());
            if (woundIndex !== -1) {
                this.hand.splice(woundIndex, 1);
                this.wounds.pop();
                this.healingPoints--;
                return true;
            }
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
        // TODO: Check for level up
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
        this.wounds = [];
        this.initializeDeck();
        this.drawCards();
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
            discardSize: this.discard.length
        };
    }
}

export default Hero;
