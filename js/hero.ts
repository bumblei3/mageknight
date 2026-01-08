// Hero class for Mage Knight

import { createDeck, shuffleDeck, createWoundCard, GOLDYX_STARTER_DECK, SAMPLE_ARTIFACTS, Card, CardData } from './card';
import { MANA_COLORS, ManaColor } from './constants';
import { HeroInventory } from './hero/HeroInventory';
import { HeroSkills } from './hero/HeroSkills';
import { store, ACTIONS } from './game/Store';

// Fame thresholds for levels
export interface LevelEntry {
    level: number;
    fame: number;
    reward?: string;
}

export const LEVEL_TABLE: LevelEntry[] = [
    { level: 1, fame: 0 },
    { level: 2, fame: 10, reward: 'skill_card' },
    { level: 3, fame: 30, reward: 'unit_skill' },
    { level: 4, fame: 60, reward: 'skill_card' },
    { level: 5, fame: 100, reward: 'unit_skill' }
];

export interface Position {
    q: number;
    r: number;
}

export interface HeroConfig {
    name: string;
    id: string;
    portrait?: string;
    stats?: {
        armor?: number;
        handLimit?: number;
    };
    starterDeck?: CardData[];
}

export interface Skill {
    id: string;
    name: string;
    type: 'active' | 'passive';
    description?: string;
}

export interface Unit {
    getName(): string;
    getState?(): unknown;
    refresh(): void;
}

export interface CardEffect {
    movement?: number;
    attack?: number;
    block?: number;
    influence?: number;
    healing?: number;
    [key: string]: unknown;
}

export interface PlayResult {
    card: Card;
    effect: CardEffect;
    usedStrong?: boolean;
}

export interface LevelUpResult {
    leveledUp: boolean;
    newLevel?: number;
    reward?: string;
}

export interface RecruitResult {
    success: boolean;
    message: string;
}

export interface HeroStats {
    name: string;
    level: number;
    armor: number;
    handLimit: number;
    fame: number;
    reputation: number;
    wounds: number;
    deckSize: number;
    handSize: number;
    discardSize: number;
    units: number;
    commandLimit: number;
    skills: Skill[];
}

export interface HeroState {
    name: string;
    level: number;
    fame: number;
    reputation: number;
    armor: number;
    movementPoints: number;
    attackPoints: number;
    blockPoints: number;
    influencePoints: number;
    healingPoints: number;
    handLimit: number;
    commandLimit: number;
    position: Position;
    deck: Card[];
    hand: Card[];
    discard: Card[];
    wounds: Card[];
    crystals: Record<string, number>;
    skills: Skill[];
    tempMana: ManaColor[];
    units: unknown[];
}

export class Hero {
    name: string;
    id: string;
    config: HeroConfig;
    position: Position;
    displayPosition: Position;
    level: number;
    armor: number;
    handLimit: number;
    fame: number;
    reputation: number;
    commandLimit: number;

    private _inventory: HeroInventory;
    private _skills: HeroSkills;

    skills: Skill[];
    usedSkills: Set<string>;
    crystals: Record<string, number>;
    tempMana: ManaColor[];

    deck: Card[];
    hand: Card[];
    discard: Card[];
    wounds: Card[];
    units: Unit[];
    statuses: Set<string>;

    movementPoints: number;
    attackPoints: number;
    blockPoints: number;
    influencePoints: number;
    healingPoints: number;

    constructor(configOrName: HeroConfig | string, startingPosition: Position = { q: 0, r: 0 }) {
        if (typeof configOrName === 'string') {
            this.config = { name: configOrName, id: configOrName.toLowerCase(), stats: {} };
        } else {
            this.config = configOrName || { name: 'Hero', id: 'hero', stats: {} };
        }

        this.name = this.config.name;
        this.id = this.config.id;
        this.position = startingPosition;
        this.displayPosition = { ...startingPosition };

        this.level = 1;
        this.armor = this.config.stats?.armor || 2;
        this.handLimit = this.config.stats?.handLimit || 5;
        this.fame = 0;
        this.reputation = 0;
        this.commandLimit = 1;

        this._inventory = new HeroInventory();
        this._skills = new HeroSkills(this);

        this.skills = this._skills.skills;
        this.usedSkills = this._skills.usedSkills;
        this.crystals = this._inventory.crystals;
        this.tempMana = this._inventory.tempMana as ManaColor[];

        this.deck = [];
        this.hand = [];
        this.discard = [];
        this.wounds = [];
        this.units = [];
        this.statuses = new Set();

        this.movementPoints = 0;
        this.attackPoints = 0;
        this.blockPoints = 0;
        this.influencePoints = 0;
        this.healingPoints = 0;

        this.initializeDeck();
        this.syncStore();
    }

    syncStore(): void {
        if (!store) return;

        store.dispatch(ACTIONS.SET_HERO_STATS, {
            name: this.name,
            portrait: this.config.portrait,
            level: this.level,
            fame: this.fame,
            reputation: this.reputation,
            armor: this.armor,
            handLimit: this.handLimit,
            commandLimit: this.commandLimit,
            skills: [...this.skills],
            usedSkills: Array.isArray(this.usedSkills) ? [...this.usedSkills] : [...this.usedSkills.values()],
            wounds: this.wounds.length,
            deckSize: this.deck.length,
            handSize: this.hand.length,
            discardSize: this.discard.length,
            units: [...this.units],
            hand: [...this.hand]
        });

        store.dispatch(ACTIONS.SET_HERO_RESOURCES, {
            movementPoints: this.movementPoints,
            attackPoints: this.attackPoints,
            blockPoints: this.blockPoints,
            influencePoints: this.influencePoints,
            healingPoints: this.healingPoints,
            tempMana: [...this.tempMana]
        });

        store.dispatch(ACTIONS.SET_HERO_INVENTORY, {
            crystals: { ...this.crystals }
        });
    }

    initializeDeck(): void {
        const starterDeck = this.config?.starterDeck || GOLDYX_STARTER_DECK;
        this.deck = shuffleDeck(createDeck(starterDeck));
        this.hand = [];
        this.discard = [];
    }

    drawCards(count: number | null = null): Card[] {
        const cardsToDraw = count !== null ? count : (this.handLimit - this.hand.length);
        const drawnCards: Card[] = [];

        for (let i = 0; i < cardsToDraw; i++) {
            const card = this.drawCard();
            if (card) {
                drawnCards.push(card);
            }
        }

        this.syncStore();
        return drawnCards;
    }

    drawCard(): Card | null {
        if (this.deck.length > 0) {
            const card = this.deck.pop()!;
            this.hand.push(card);
            return card;
        }
        return null;
    }

    playCard(cardIndex: number, useStrong = false, isNight = false): PlayResult | null {
        if (cardIndex < 0 || cardIndex >= this.hand.length) {
            return null;
        }

        const card = this.hand[cardIndex];

        if (useStrong) {
            const success = this.spendMana(card.color as ManaColor, isNight);
            if (!success) {
                return null;
            }
        }

        this.hand.splice(cardIndex, 1);
        const effect = card.getEffect(useStrong);

        if (effect.movement) this.movementPoints += effect.movement;
        if (effect.attack) this.attackPoints += effect.attack;
        if (effect.block) this.blockPoints += effect.block;
        if (effect.influence) this.influencePoints += effect.influence;
        if (effect.healing) this.healingPoints += effect.healing;

        this.discard.push(card);
        this.syncStore();
        return { card, effect, usedStrong: useStrong };
    }

    playCardSideways(cardIndex: number, effectType: string): PlayResult | null {
        if (cardIndex < 0 || cardIndex >= this.hand.length) {
            return null;
        }

        const card = this.hand[cardIndex];
        if (!card.canPlaySideways()) {
            return null;
        }

        this.hand.splice(cardIndex, 1);

        const effects: Record<string, () => void> = {
            movement: () => this.movementPoints += 1,
            attack: () => this.attackPoints += 1,
            block: () => this.blockPoints += 1,
            influence: () => this.influencePoints += 1
        };

        if (effects[effectType]) {
            effects[effectType]();
        }

        this.discard.push(card);
        this.syncStore();
        return { card, effect: { [effectType]: 1 } };
    }

    discardCard(cardIndex: number): Card | null {
        if (cardIndex >= 0 && cardIndex < this.hand.length) {
            const card = this.hand.splice(cardIndex, 1)[0];
            this.discard.push(card);
            return card;
        }
        return null;
    }

    discardNonWoundCards(count: number): number {
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

    rest(cardIndices: number[] = []): Card[] {
        const sortedIndices = [...cardIndices].sort((a, b) => b - a);
        const discardedCards: Card[] = [];

        for (const index of sortedIndices) {
            const card = this.discardCard(index);
            if (card) {
                discardedCards.push(card);
            }
        }

        this.drawCards();
        return discardedCards;
    }

    endTurn(): void {
        this.discard.push(...this.hand);
        this.hand = [];

        this.movementPoints = 0;
        this.attackPoints = 0;
        this.blockPoints = 0;
        this.influencePoints = 0;
        this.healingPoints = 0;

        this.clearTempMana();
        this.drawCards();

        if (this.hasSkill('noble_manners')) {
            this.influencePoints = 2;
        }
        this.syncStore();
    }

    takeWound(): void {
        const wound = createWoundCard();
        this.hand.push(wound);
        this.wounds.push(wound);
        this.syncStore();
    }

    takeWoundToDiscard(): void {
        const wound = createWoundCard();
        this.discard.push(wound);
        this.wounds.push(wound);
        this.syncStore();
    }

    healWound(useHealingPoints = true): boolean {
        if (this.wounds.length === 0) {
            return false;
        }

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
            this.syncStore();
            return true;
        }

        this.syncStore();
        return false;
    }

    moveTo(q: number, r: number, cost = 0): boolean {
        if (this.movementPoints >= cost) {
            this.position = { q, r };
            this.movementPoints -= cost;
            this.syncStore();
            return true;
        }
        this.syncStore();
        return false;
    }

    gainFame(amount: number): LevelUpResult {
        this.fame += amount;
        const nextLevel = LEVEL_TABLE.find(l => l.level === this.level + 1);
        if (nextLevel && this.fame >= nextLevel.fame) {
            return { leveledUp: true, newLevel: nextLevel.level, reward: nextLevel.reward };
        }
        this.syncStore();
        return { leveledUp: false };
    }

    levelUp(): void {
        this.level++;
        if (this.level % 2 === 1) {
            this.commandLimit++;
            this.armor++;
        } else {
            this.handLimit++;
        }
        this.syncStore();
    }

    hasSkill(skillId: string): boolean {
        return this.skills.some(s => s.id === skillId);
    }

    canUseSkill(skillId: string): boolean {
        const skill = this.skills.find(s => s.id === skillId);
        if (!skill || skill.type !== 'active') return false;
        return !this.usedSkills.has(skillId);
    }

    useSkill(skillId: string): boolean {
        if (!this.canUseSkill(skillId)) return false;
        this.usedSkills.add(skillId);
        return true;
    }

    addSkill(skill: Skill): void {
        this.skills.push(skill);
        if (skill.id === 'dragon_scales') {
            this.armor += 1;
        }
        this.syncStore();
    }

    addCardToDeck(card: Card): void {
        const newCard = (card && typeof card.clone === 'function') ? card.clone() : card;
        this.deck.unshift(newCard);
        this.syncStore();
    }

    changeReputation(amount: number): void {
        this.reputation += amount;
        this.reputation = Math.max(-7, Math.min(7, this.reputation));
        this.syncStore();
    }

    getReputationModifier(): number {
        if (this.reputation >= 3) return 2;
        if (this.reputation >= 1) return 1;
        if (this.reputation <= -5) return -2;
        if (this.reputation <= -2) return -1;
        return 0;
    }

    reset(): void {
        this.level = 1;
        this.fame = 0;
        this.reputation = 0;
        this.armor = 2;
        this.handLimit = 5;
        this.commandLimit = 1;
        this.position = { q: 0, r: 0 };
        this.movementPoints = 0;
        this.attackPoints = 0;
        this.blockPoints = 0;
        this.influencePoints = 0;
        this.healingPoints = 0;
        this.wounds = [];
        this.units = [];
        this.skills = [];
        this.crystals = {} as Record<string, number>;

        this.initializeDeck();
        this.drawCards();
        this.syncStore();
    }

    prepareNewRound(): void {
        if (this.discard.length > 0) {
            this.deck = shuffleDeck([...this.deck, ...this.discard]);
            this.discard = [];
        } else if (this.deck.length > 0) {
            this.deck = shuffleDeck(this.deck);
        }

        if (this.hasSkill('glittering_fortune')) {
            const colors = Object.values(MANA_COLORS).slice(0, 4) as ManaColor[];
            const randomColor = colors[Math.floor(Math.random() * 4)];
            this.addCrystal(randomColor);
        }

        this.usedSkills.clear();
    }

    getManaInventory(): (ManaColor | string)[] {
        const inventory: (ManaColor | string)[] = [...this.tempMana];
        for (const [color, count] of Object.entries(this.crystals)) {
            for (let i = 0; i < count; i++) {
                inventory.push(color);
            }
        }
        return inventory;
    }

    getState(): HeroState {
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
            commandLimit: this.commandLimit,
            position: { ...this.position },
            deck: [...this.deck],
            hand: [...this.hand],
            discard: [...this.discard],
            wounds: [...this.wounds],
            crystals: { ...this.crystals },
            skills: [...this.skills],
            tempMana: [...this.tempMana],
            units: this.units.map(u => (typeof u.getState === 'function' ? u.getState() : u))
        };
    }

    loadState(state: Partial<HeroState>): void {
        if (!state) return;
        if (state.name !== undefined) this.name = state.name;
        if (state.level !== undefined) this.level = state.level;
        if (state.fame !== undefined) this.fame = state.fame;
        if (state.reputation !== undefined) this.reputation = state.reputation;
        if (state.armor !== undefined) this.armor = state.armor;
        if (state.movementPoints !== undefined) this.movementPoints = state.movementPoints;
        if (state.attackPoints !== undefined) this.attackPoints = state.attackPoints;
        if (state.blockPoints !== undefined) this.blockPoints = state.blockPoints;
        if (state.influencePoints !== undefined) this.influencePoints = state.influencePoints;
        if (state.healingPoints !== undefined) this.healingPoints = state.healingPoints;
        if (state.handLimit !== undefined) this.handLimit = state.handLimit;
        if (state.commandLimit !== undefined) this.commandLimit = state.commandLimit;
        if (state.position) this.position = { ...state.position };
        this.displayPosition = { ...this.position };
        if (state.deck) this.deck = [...state.deck];
        if (state.hand) this.hand = [...state.hand];
        if (state.discard) this.discard = [...state.discard];
        if (state.wounds) this.wounds = [...state.wounds];
        if (state.crystals) this.crystals = { ...state.crystals };
        if (state.skills) this.skills = [...state.skills];
        if (state.tempMana) this.tempMana = [...state.tempMana];
        if (state.units) this.units = state.units as Unit[];
    }

    addStatus(status: string): void {
        this.statuses.add(status);
    }

    removeStatus(status: string): void {
        this.statuses.delete(status);
    }

    hasStatus(status: string): boolean {
        return this.statuses.has(status);
    }

    getStats(): HeroStats {
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

    addUnit(unit: Unit): boolean {
        if (this.units.length < this.commandLimit) {
            this.units.push(unit);
            return true;
        }
        return false;
    }

    removeUnit(index: number): Unit | null {
        if (index >= 0 && index < this.units.length) {
            return this.units.splice(index, 1)[0];
        }
        return null;
    }

    getUnits(): Unit[] {
        return this.units;
    }

    refreshUnits(): void {
        this.units.forEach(unit => unit.refresh());
    }

    recruitUnit(unit: Unit, influenceCost: number): RecruitResult {
        if (this.units.length >= this.commandLimit) {
            return { success: false, message: 'Kein Platz für weitere Einheiten.' };
        }

        if (this.influencePoints < influenceCost) {
            return { success: false, message: 'Nicht genug Einfluss.' };
        }

        this.influencePoints -= influenceCost;
        this.units.push(unit);
        return { success: true, message: `${unit.getName()} rekrutiert!` };
    }

    learnSpell(spellCard: Card, influenceCost: number): RecruitResult {
        if (this.influencePoints < influenceCost) {
            return { success: false, message: 'Nicht genug Einfluss.' };
        }

        this.influencePoints -= influenceCost;
        this.discard.push(spellCard);
        return { success: true, message: `${spellCard.name} gelernt!` };
    }

    learnAdvancedAction(actionCard: Card, influenceCost: number): RecruitResult {
        if (this.influencePoints < influenceCost) {
            return { success: false, message: 'Nicht genug Einfluss.' };
        }

        this.influencePoints -= influenceCost;
        this.discard.push(actionCard);
        return { success: true, message: `${actionCard.name} gelernt!` };
    }

    gainCardToHand(card: Card): RecruitResult {
        this.hand.push(card);
        return { success: true, message: `${card.name} erhalten!` };
    }

    addCrystal(color: ManaColor | string): boolean {
        if (this.crystals[color] !== undefined) {
            if (this.crystals[color] < 3) {
                this.crystals[color]++;
                return true;
            }
        }
        return false;
    }

    useCrystal(color: ManaColor | string): boolean {
        if (this.crystals[color] > 0) {
            this.crystals[color]--;
            return true;
        }
        return false;
    }

    takeManaFromSource(color: ManaColor): boolean {
        this.tempMana.push(color);
        this.syncStore();
        return true;
    }

    hasMana(requiredColor: ManaColor, isNight = false): boolean {
        if (!requiredColor) return false;
        return this.tempMana.some(m =>
            m === requiredColor || (!isNight && m === MANA_COLORS.GOLD)
        );
    }

    canAffordMana(card: Card, isNight = false): boolean {
        // If checking for Strong effect (implied 1 mana cost of card color)
        if (card.color && (card.type === 'action' || card.type === 'spell')) {
            return this.hasMana(card.color as ManaColor, isNight);
        }

        // Legacy/Generic check
        if (!card.manaCost || card.manaCost === 0) return true;
        return this.hasMana(card.color as ManaColor, isNight);
    }

    spendMana(requiredColor: ManaColor, isNight = false): boolean {
        if (!requiredColor) return false;

        let index = this.tempMana.indexOf(requiredColor);

        if (index === -1 && !isNight) {
            index = this.tempMana.indexOf(MANA_COLORS.GOLD as ManaColor);
        }

        if (index !== -1) {
            this.tempMana.splice(index, 1);
            this.syncStore();
            return true;
        }

        return false;
    }

    clearTempMana(): void {
        this.tempMana = [];
        this.syncStore();
    }

    awardRandomArtifact(): void {
        const randomArt = SAMPLE_ARTIFACTS[Math.floor(Math.random() * SAMPLE_ARTIFACTS.length)];
        const card = createDeck([randomArt])[0];
        this.discard.push(card);
    }
}

export default Hero;
