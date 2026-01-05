// Hero class for Mage Knight

import { createDeck, shuffleDeck, createWoundCard, GOLDYX_STARTER_DECK, SAMPLE_ARTIFACTS } from './card.js';
import { MANA_COLORS } from './mana.js';
import { HeroInventory } from './hero/HeroInventory.js';
import { HeroSkills } from './hero/HeroSkills.js';

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
        this.commandLimit = 1;

        // Compose modules
        this._inventory = new HeroInventory();
        this._skills = new HeroSkills(this);

        // Backward-compatible property access
        this.skills = this._skills.skills;
        this.usedSkills = this._skills.usedSkills;
        this.crystals = this._inventory.crystals;
        this.tempMana = this._inventory.tempMana;

        // Cards
        this.deck = [];
        this.hand = [];
        this.discard = [];
        this.wounds = [];

        // Units
        this.units = [];

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
        // In Mage Knight, deck does not auto-refill from discard during a round.
        // It only refills at the start of a new Round.
        // if (this.deck.length === 0 && this.discard.length > 0) ... REMOVED

        // Draw from deck
        if (this.deck.length > 0) {
            const card = this.deck.pop();
            this.hand.push(card);
            return card;
        }

        return null;
    }

    // Play a card from hand
    // Play a card from hand
    playCard(cardIndex, useStrong = false, isNight = false) {
        if (cardIndex < 0 || cardIndex >= this.hand.length) {
            return null;
        }

        const card = this.hand[cardIndex];

        // If using strong effect, check and spend mana
        if (useStrong) {
            // For standard action cards, manaCost might not be set on instance,
            // but logic implies using mana matching color
            const success = this.spendMana(card.color, isNight);
            if (!success) {
                // If explicit strong play requested but failed mana, fail the action
                // This prevents accidental basic plays when user wanted strong
                return null;
            }
        }

        // Only remove from hand if successful
        this.hand.splice(cardIndex, 1);

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

    // Discard a specific number of non-wound cards (used for Paralyze effect)
    discardNonWoundCards(count) {
        let discardedCount = 0;
        for (let i = 0; i < count; i++) {
            const index = this.hand.findIndex(card => !card.isWound());
            if (index !== -1) {
                this.discardCard(index);
                discardedCount++;
            } else {
                break;
            }
        }
        return discardedCount;
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

        this.drawCards();

        // Passive Skill: Noble Manners
        if (this.hasSkill('noble_manners')) {
            this.influencePoints = 2;
        }
    }

    // Take a wound
    takeWound() {
        const wound = createWoundCard();
        this.hand.push(wound);
        this.wounds.push(wound);
    }

    // Take a wound to discard pile (Poison effect)
    takeWoundToDiscard() {
        const wound = createWoundCard();
        this.discard.push(wound);
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

    // Level Up - Logic handled by LevelUpManager mostly now
    levelUp() {
        this.level++;
        // Base stat increases (restored for compatibility and robustness)
        if (this.level % 2 === 1) {
            // Odd levels (3, 5) give Command Token
            this.commandLimit++;
            this.armor++;
        } else {
            // Even levels (2, 4) give Hand Limit
            this.handLimit++;
        }
    }

    hasSkill(skillId) {
        return this.skills.some(s => s.id === skillId);
    }

    /**
     * Skill Usage (Active Skills)
     */
    canUseSkill(skillId) {
        const skill = this.skills.find(s => s.id === skillId);
        if (!skill || skill.type !== 'active') return false;
        return !this.usedSkills.has(skillId);
    }

    useSkill(skillId) {
        if (!this.canUseSkill(skillId)) return false;
        this.usedSkills.add(skillId);
        return true;
    }

    // Add Skill
    addSkill(skill) {
        this.skills.push(skill);

        // Apply passive effects immediately if needed
        if (skill.id === 'dragon_scales') {
            this.armor += 1;
        }
    }

    addCardToDeck(card) {
        // Clone to ensure we have a fresh instance
        const newCard = card.clone();

        // Add to Discard pile (standard deckbuilder rule: new cards go to discard)
        // Or Top of Deck? Mage Knight rules usually: on top of Deed deck unless specified.
        // Let's add to TOP of deck for immediate gratification in next draw
        this.deck.unshift(newCard);
        // Note: if doing "Deed Deck" style, might need to shuffle. For now, Top Deck is fun.
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
        this.level = 1;
        this.fame = 0;
        this.reputation = 0;

        // Base stats
        this.armor = 2;
        this.handLimit = 5;
        this.commandLimit = 1; // Default starting limit? need to check constructor

        // Dynamic stats
        this.position = { q: 0, r: 0 };
        this.movementPoints = 0;
        this.attackPoints = 0;
        this.blockPoints = 0;
        this.influencePoints = 0;
        this.healingPoints = 0;
        this.wounds = [];
        this.units = [];
        this.skills = []; // Also reset skills
        this.crystals = []; // And crystals

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

        // Passive Skill: Glittering Fortune
        if (this.hasSkill('glittering_fortune')) {
            const randomColor = Object.values(MANA_COLORS)[Math.floor(Math.random() * 4)]; // R,G,B,W
            this.addCrystal(randomColor);
        }

        // Reset active skills
        this.usedSkills.clear();
        // In game.js: hero.endTurn() (discards hand) -> check deck empty -> prepareNewRound
        // So yes, discard contains everything.
    }

    // Get mana inventory for UI
    getManaInventory() {
        const inventory = [...this.tempMana];
        for (const [color, count] of Object.entries(this.crystals)) {
            for (let i = 0; i < count; i++) {
                inventory.push(color);
            }
        }
        return inventory;
    }

    /**
     * Gets full state for persistence.
     */
    getState() {
        return {
            name: this.name,
            level: this.level,
            fame: this.fame,
            reputation: this.reputation,
            armor: this.armor,
            movementPoints: this.movementPoints,
            attackPoints: this.attackPoints,
            blockPoints: this.blockPoints,
            influencePoints: this.influencePoints,
            healingPoints: this.healingPoints,
            handLimit: this.handLimit,
            commandLimit: this.commandLimit, // Added commandLimit to getState
            position: { ...this.position },
            deck: [...this.deck],
            hand: [...this.hand],
            discard: [...this.discard],
            wounds: [...this.wounds], // Wounds should be copied
            crystals: { ...this.crystals },
            skills: [...this.skills], // Skills should be copied
            tempMana: [...this.tempMana], // tempMana should be copied
            units: this.units.map(u => (typeof u.getState === 'function' ? u.getState() : u))
        };
    }

    /**
     * Loads state from object.
     */
    loadState(state) {
        if (!state) return;
        this.name = state.name;
        this.level = state.level;
        this.fame = state.fame;
        this.reputation = state.reputation;
        this.armor = state.armor;
        this.movementPoints = state.movementPoints;
        this.attackPoints = state.attackPoints;
        this.blockPoints = state.blockPoints;
        this.influencePoints = state.influencePoints;
        this.healingPoints = state.healingPoints;
        this.handLimit = state.handLimit;
        this.commandLimit = state.commandLimit !== undefined ? state.commandLimit : this.commandLimit; // Load commandLimit
        this.position = state.position ? { ...state.position } : this.position;
        this.displayPosition = { ...this.position }; // Assuming displayPosition is derived or set similarly
        this.deck = state.deck ? [...state.deck] : this.deck;
        this.hand = state.hand ? [...state.hand] : this.hand;
        this.discard = state.discard ? [...state.discard] : this.discard;
        this.wounds = state.wounds !== undefined ? [...state.wounds] : this.wounds; // Wounds should be copied
        this.crystals = state.crystals ? { ...state.crystals } : this.crystals;
        this.skills = state.skills !== undefined ? [...state.skills] : this.skills; // Load skills
        this.tempMana = state.tempMana !== undefined ? [...state.tempMana] : this.tempMana; // Load tempMana

        if (state.units) {
            // Need to handle unit reconstitution if they are classes
            this.units = state.units; // This might need deeper cloning/reconstitution if units are complex objects/classes
        }
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

    // Gain card directly to hand (e.g. from Level Up)
    gainCardToHand(card) {
        this.hand.push(card);
        // Maybe sort hand or trigger UI update?
        // UI update happens in Game.render()
        return { success: true, message: `${card.name} erhalten!` };
    }

    // Crystal management (max 3 per color)
    addCrystal(color) {
        if (this.crystals[color] !== undefined) {
            if (this.crystals[color] < 3) {
                this.crystals[color]++;
                return true;
            }
        }
        return false;
    }

    useCrystal(color) {
        if (this.crystals[color] > 0) {
            this.crystals[color]--;
            return true;
        }
        return false;
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
    hasMana(requiredColor, isNight = false) {
        if (!requiredColor) return false;
        // Gold can substitute any color ONLY during the day
        return this.tempMana.some(m =>
            m === requiredColor || (!isNight && m === MANA_COLORS.GOLD)
        );
    }

    // Check if hero can afford card's mana cost
    canAffordMana(card, isNight = false) {
        if (!card.manaCost || card.manaCost === 0) return true;

        // For simplicity: need 1 mana matching card color (or gold if day)
        return this.hasMana(card.color, isNight);
    }

    // Spend mana for a card (prefer exact match, fallback to gold if day)
    spendMana(requiredColor, isNight = false) {
        if (!requiredColor) return false;

        // Try exact match first
        let index = this.tempMana.indexOf(requiredColor);

        // Fallback to gold wildcard (DAY ONLY)
        if (index === -1 && !isNight) {
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

    // Award a random artifact to the hero
    awardRandomArtifact() {
        const randomArt = SAMPLE_ARTIFACTS[Math.floor(Math.random() * SAMPLE_ARTIFACTS.length)];
        const card = createDeck([randomArt])[0];
        this.discard.push(card);
    }
}

export default Hero;
