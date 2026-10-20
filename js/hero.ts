// Hero class for Mage Knight

import { createDeck, shuffleDeck, createWoundCard, GOLDYX_STARTER_DECK, SAMPLE_ARTIFACTS, Card, CardData } from './card';
import { CARD_DEFINITIONS, findCardDefinition } from './card/CardDefinitions';
import { MANA_COLORS, ManaColor } from './constants';
import { HeroInventory, Crystals } from './hero/HeroInventory';
import { CONDITION_REPUTATION_LOSS, REPUTATION_LOSS_PER_PLAY, PRIMARY_EFFECT_ORDER } from './card/effectMeta';
import { createUnit, UNIT_INFO } from './unit';
import { HeroSkills } from './hero/HeroSkills';
import { store, ACTIONS } from './store';

/** Wish spell values — see rules.md, section 7. */
export const WISH_HEAL = 5;
export const WISH_ATTACK = 5;

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
    /** Effect magnitude declared by `js/skills/skillDefinitions.ts`. */
    value?: number;
    /** Wounds the hero takes as the cost of using the skill. */
    selfWound?: number;
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
    /** Pending extra turns granted by Time Walk. */
    extraTurns?: number;
    position: Position;
    deck: string[];
    hand: string[];
    discard: string[];
    wounds: string[];
    crystals: Record<string, number>;
    skills: Skill[];
    tempMana: ManaColor[];
    units: unknown[];
    equippedArtifact: string | null;
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
    /** Armed by Concentrate; spent on the next card's primary effect this turn. */
    nextCardBonus: number;
    /** Extra turns granted by Time Walk; TurnManager spends them. */
    extraTurns: number;
    /** Soul Stealer: heals the hero for each enemy the artifact attack defeats. */
    vampirism: number;
    /**
     * Cards drawn by Concentration's "keep" rule. They stay in the hand when
     * the turn ends instead of going to the discard pile, and are dropped from
     * the set at that moment (so they are discarded on the following turn).
     */
    keptCardIds: Set<string>;
    tempMana: ManaColor[];

    deck: Card[];
    hand: Card[];
    discard: Card[];
    wounds: Card[];
    units: Unit[];
    statuses: Set<string>;

    // Artifact system
    equippedArtifact: Card | null = null;

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
        this.nextCardBonus = 0;
        this.extraTurns = 0;
        this.vampirism = 0;
        this.keptCardIds = new Set();

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
        // If deck is empty, shuffle discard pile back into deck
        if (this.deck.length === 0 && this.discard.length > 0) {
            this.deck = shuffleDeck([...this.discard]);
            this.discard = [];
        }

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
        const declaredEffect = card.getEffect(useStrong);

        // "Boost the next card you play this turn" (Concentrate): arm the bonus
        // and do nothing else with this card.
        if (declaredEffect.enhanceNext) {
            this.nextCardBonus += Number(declaredEffect.enhanceNext) || 0;
            this.discard.push(card);
            this.syncStore();
            return { card, effect: declaredEffect, usedStrong: useStrong };
        }

        // Apply an armed bonus to this card's primary effect. Copy the effect
        // first: the Card instance is recycled from the discard pile and must
        // not stay boosted forever.
        let effect = declaredEffect;
        if (this.nextCardBonus > 0) {
            const target = PRIMARY_EFFECT_ORDER.find(
                (key) => typeof declaredEffect[key] === 'number' && (declaredEffect[key] as number) > 0
            );
            if (target) {
                effect = {
                    ...declaredEffect,
                    [target]: (declaredEffect[target] as number) + this.nextCardBonus,
                    enhancedBy: this.nextCardBonus
                };
                this.nextCardBonus = 0;
            }
        }

        if (effect.movement) this.movementPoints += effect.movement;
        if (effect.attack) this.attackPoints += effect.attack;
        if (effect.block) this.blockPoints += effect.block;
        if (effect.influence) this.influencePoints += effect.influence;
        if (effect.healing) this.healingPoints += effect.healing;

        // Effects that need a side channel (deck, inventory, limits) — these
        // keys are lifted from the card data by Card.normalizeEffect().
        const drawn = effect.draw ? this.drawCards(effect.draw as number) : [];
        // Concentration strong: the card drawn by this play is kept in hand
        // when the turn ends (it does not go to the discard pile).
        if (effect.keep) {
            drawn.forEach((kept) => this.keptCardIds.add(kept.id));
        }
        if (effect.mana) this.gainManaTokens(card.color, effect.mana as number);
        if (effect.crystal) this.gainCrystals(card.color, effect.crystal as number);
        if (effect.handLimitBonus) this.handLimit += effect.handLimitBonus as number;
        if (effect.summonUnit) this.summonUnits(effect.summonUnit as number);
        if (effect.extraTurn) this.extraTurns += Number(effect.extraTurn) || 0;
        if (effect.condition === CONDITION_REPUTATION_LOSS) {
            this.changeReputation(REPUTATION_LOSS_PER_PLAY);
        }

        // Keyword rules that ride along on a primary effect rather than
        // standing alone: the influence spent recruits units (Call to Arms),
        // and the heal cleanses a wound (Cure).
        if (effect.unitRecruitment) {
            this.recruitUnits(Number(effect.unitRecruitment) || 0);
        }
        if (effect.cleanse) {
            this.cleanseWound();
        }

        this.discard.push(card);
        this.syncStore();
        return { card, effect, usedStrong: useStrong };
    }

    /**
     * Spend influence to recruit a unit (Call to Arms). The command limit
     * applies, so a recruit that no longer fits is refused. Returns how many
     * units joined and why the rest did not.
     */
    recruitUnits(count: number): { recruited: number; refused: number; units: Unit[] } {
        const joined: Unit[] = [];
        let refused = 0;
        const wanted = Math.max(0, Math.floor(count) || 0);
        const types = Object.keys(UNIT_INFO);

        for (let i = 0; i < wanted; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const unit = createUnit(type);
            if (!unit || !this.addUnit(unit)) {
                refused++;
                continue;
            }
            joined.push(unit);
        }

        if (joined.length > 0) this.syncStore();
        return { recruited: joined.length, refused, units: joined };
    }

    /**
     * Vampirism (Soul Stealer artifact): heal the hero for the wounds the
     * enemy dealt. Artifacts are passive, so this is called from the damage
     * resolution, not from playing a card.
     */
    vampiricHeal(amount: number): number {
        const wanted = Math.max(0, Math.floor(amount) || 0);
        if (wanted === 0) return 0;

        let healed = 0;
        while (healed < wanted && this.healWound(false)) healed++;
        return healed;
    }

    /**
     * Grant mana tokens of the card's color (colorless cards grant gold).
     * Returns how many tokens were actually gained.
     */
    gainManaTokens(color: string | null, count: number): number {
        const manaColor = (
            Object.values(MANA_COLORS).includes(color as ManaColor) ? color : MANA_COLORS.GOLD
        ) as ManaColor;

        let granted = 0;
        for (let i = 0; i < count; i++) {
            if (this.addMana(manaColor)) granted++;
        }
        return granted;
    }

    /**
     * Summon units declared by a card (`type: 'summon_unit'`, value = how many).
     * Each unit is drawn from UNIT_INFO; the command limit still applies, so a
     * summon that no longer fits is dropped. Returns the units that joined.
     */
    summonUnits(count: number): Unit[] {
        const units: Unit[] = [];
        const types = Object.keys(UNIT_INFO);
        const wanted = Math.max(0, Math.floor(count) || 0);

        for (let i = 0; i < wanted; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const unit = createUnit(type);
            if (!unit || !this.addUnit(unit)) break;
            units.push(unit);
        }

        if (units.length > 0) this.syncStore();
        return units;
    }

    /**
     * Spend one pending extra turn (Time Walk). Returns true when the turn that
     * just ended was the extra one, i.e. the round counter must not advance.
     */
    consumeExtraTurn(): boolean {
        if (this.extraTurns <= 0) return false;
        this.extraTurns--;
        this.syncStore();
        return true;
    }

    /**
     * Drop a bonus armed by Concentrate (called when the turn ends).
     */
    clearTurnBonus(): void {
        this.nextCardBonus = 0;
    }

    /**
     * Wish (spell): one pick out of three. The card text is
     * "Heal 5, or +5 Attack, or Gain Artifact".
     */
    resolveWish(option: 'heal' | 'attack' | 'artifact'): { success: boolean; message: string } {
        if (option === 'attack') {
            this.attackPoints += WISH_ATTACK;
            this.syncStore();
            return { success: true, message: `Wunsch: +${WISH_ATTACK} Angriff` };
        }

        if (option === 'heal') {
            let healed = 0;
            while (healed < WISH_HEAL && this.healWound(false)) healed++;
            this.syncStore();
            return {
                success: true,
                message: `Wunsch: ${healed} Wunde(n) geheilt`
            };
        }

        if (option === 'artifact') {
            this.awardRandomArtifact();
            this.syncStore();
            return { success: true, message: 'Wunsch: Artefakt erhalten' };
        }

        return { success: false, message: 'Unbekannter Wunsch' };
    }

    /**
     * Improvisation: copy cards from the discard pile back into the hand.
     * Unknown ids are skipped, so a stale pick cannot duplicate cards.
     */
    copyCardsFromDiscard(cardIds: string[]): Card[] {
        const copied: Card[] = [];
        for (const id of cardIds || []) {
            const index = this.discard.findIndex((card) => card.id === id);
            if (index === -1) continue;
            const [card] = this.discard.splice(index, 1);
            this.hand.push(card);
            copied.push(card);
        }
        if (copied.length > 0) this.syncStore();
        return copied;
    }

    /** Cards currently in the discard pile (for the Improvisation picker). */
    getDiscardCards(): Card[] {
        return [...this.discard];
    }

    /**
     * Grant mana crystals of the card's color (colorless cards grant gold).
     * The inventory caps each color at 3, so this returns what really landed.
     */
    gainCrystals(color: string | null, count: number): number {
        const crystalColor = (color || MANA_COLORS.GOLD) as unknown as keyof Crystals;

        let granted = 0;
        for (let i = 0; i < count; i++) {
            if (this._inventory.addCrystal(crystalColor)) granted++;
        }
        if (granted > 0) this.syncStore();
        return granted;
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

    // ========== Artifact System ==========

    /** Equip an artifact from hand */
    equipArtifact(cardIndex: number): boolean {
        if (cardIndex < 0 || cardIndex >= this.hand.length) {
            return false;
        }

        const card = this.hand[cardIndex];
        if (!card.isArtifact()) {
            return false;
        }

        // Unequip current artifact if any
        if (this.equippedArtifact) {
            this.unequipArtifact();
        }

        // Remove from hand and equip
        this.hand.splice(cardIndex, 1);
        this.equippedArtifact = card;

        // Apply artifact passive effects immediately
        this.applyArtifactEffects(card.basicEffect);

        this.syncStore();
        return true;
    }

    /** Use artifact's Strong Effect (unequips and applies strongEffect) */
    useArtifactStrongEffect(): { success: boolean; effect?: any; message: string } {
        if (!this.equippedArtifact) {
            return { success: false, message: 'Kein Artefakt ausgerüstet.' };
        }

        const artifact = this.equippedArtifact;
        const strongEffect = artifact.strongEffect;

        if (!strongEffect || Object.keys(strongEffect).length === 0) {
            return { success: false, message: 'Dieses Artefakt hat keinen starken Effekt.' };
        }

        // Unequip artifact (removes passive effects, returns to hand)
        this.unequipArtifact();

        // Apply strong effect
        this.applyArtifactEffects(strongEffect);

        return { 
            success: true, 
            effect: strongEffect, 
            message: `Starke Wirkung von ${artifact.name} aktiviert!` 
        };
    }

    /** Unequip current artifact */
    unequipArtifact(): Card | null {
        if (!this.equippedArtifact) {
            return null;
        }

        // Remove passive effects
        this.removeArtifactEffects(this.equippedArtifact.basicEffect);

        const oldArtifact = this.equippedArtifact;
        this.equippedArtifact = null;

        // Return to hand (or discard?)
        this.hand.push(oldArtifact);
        this.syncStore();
        return oldArtifact;
    }

    /** Apply artifact passive effects */
    private applyArtifactEffects(effect: any): void {
        if (!effect) return;

        if (effect.attack) this.attackPoints += effect.attack;
        if (effect.block) this.blockPoints += effect.block;
        if (effect.movement) this.movementPoints += effect.movement;
        if (effect.influence) this.influencePoints += effect.influence;
        if (effect.command) this.commandLimit += effect.command;

        // Soul Stealer: the attack it adds heals the hero for each enemy it
        // defeats. Counted per equipped artifact, removed on unequip.
        if (effect.vampirism) this.vampirism += 1;
    }

    /** Remove artifact passive effects */
    private removeArtifactEffects(effect: any): void {
        if (!effect) return;

        if (effect.attack) this.attackPoints = Math.max(0, this.attackPoints - effect.attack);
        if (effect.block) this.blockPoints = Math.max(0, this.blockPoints - effect.block);
        if (effect.movement) this.movementPoints = Math.max(0, this.movementPoints - effect.movement);
        if (effect.influence) this.influencePoints = Math.max(0, this.influencePoints - effect.influence);
        if (effect.command) this.commandLimit = Math.max(1, this.commandLimit - effect.command);
        if (effect.vampirism) this.vampirism = Math.max(0, this.vampirism - 1);
    }

    /** Get equipped artifact */
    getEquippedArtifact(): Card | null {
        return this.equippedArtifact;
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
        // Concentration's "keep" rule: kept cards stay in the hand, everything
        // else goes to the discard pile. The set is dropped here, so a kept
        // card is discarded on the following turn.
        const kept = this.hand.filter((card) => this.keptCardIds.has(card.id));
        const dropped = this.hand.filter((card) => !this.keptCardIds.has(card.id));

        this.discard.push(...dropped);
        this.hand = kept;
        this.keptCardIds.clear();

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

        // A wound in the hand is the one that blocks a card slot; a wound already
        // on the discard pile (poison) is healed the same way.
        const handIndex = this.hand.findIndex(card => card.isWound());
        if (handIndex !== -1) {
            this.hand.splice(handIndex, 1);
            this.wounds.pop();
            if (useHealingPoints) {
                this.healingPoints--;
            }
            this.syncStore();
            return true;
        }

        const discardIndex = this.discard.findIndex(card => card.isWound());
        if (discardIndex !== -1) {
            this.discard.splice(discardIndex, 1);
            this.wounds.pop();
            if (useHealingPoints) {
                this.healingPoints--;
            }
            this.syncStore();
            return true;
        }

        // The wound list is authoritative: a save or a test may carry wounds
        // whose card is not in hand. Drop the entry rather than refusing.
        this.wounds.pop();
        if (useHealingPoints) {
            this.healingPoints--;
        }
        this.syncStore();
        return true;
    }

    /**
     * Cleanse (Cure): the heal additionally removes one wound from the hero,
     * independent of healing points. Returns true when a wound was removed.
     */
    cleanseWound(): boolean {
        return this.healWound(false);
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
        this.nextCardBonus = 0;
        this.extraTurns = 0;
        this.vampirism = 0;
        this.keptCardIds = new Set();

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

        // Crystal Mastery (Goldyx): 1 green crystal every round.
        this.applyCrystalMastery();

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
            extraTurns: this.extraTurns,
            position: { ...this.position },
            deck: this.deck.map(c => c.id),
            hand: this.hand.map(c => c.id),
            discard: this.discard.map(c => c.id),
            wounds: this.wounds.map(w => typeof w === 'string' ? w : w.id),
            crystals: { ...this.crystals },
            skills: [...this.skills],
            tempMana: [...this.tempMana],
            units: this.units.map(u => (typeof u.getState === 'function' ? u.getState() : u)),
            equippedArtifact: this.equippedArtifact ? this.equippedArtifact.id : null
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
        if (state.extraTurns !== undefined) this.extraTurns = state.extraTurns;
        if (state.position) this.position = { ...state.position };
        this.displayPosition = { ...this.position };
        // Convert string IDs back to Card objects
        const idsToCards = (ids: (string | Card)[]): Card[] => {
            if (!Array.isArray(ids)) return [];
            return ids
                .filter(Boolean) // Drop literal null/undefined (corrupt save data)
                .map(id => {
                    if (typeof id === 'string') {
                        const def = findCardDefinition(id);
                        if (def) return new Card(def);
                        console.warn(`Card definition not found for ID: ${id}`);
                        return new Card({ id, name: 'Unknown Card', color: null });
                    }
                    // Already a Card instance: keep as-is
                    if (id instanceof Card) return id;
                    // Foreign/non-Card object: drop it (corrupt save data)
                    console.warn('Skipping non-Card entry in saved card list');
                    return null;
                })
                .filter(Boolean) as Card[]; // Drop any nulls produced above
        };
        if (state.deck) this.deck = idsToCards(state.deck);
        if (state.hand) this.hand = idsToCards(state.hand);
        if (state.discard) this.discard = idsToCards(state.discard);
        if (state.wounds) this.wounds = idsToCards(state.wounds);
        if (state.crystals) this.crystals = { ...state.crystals };
        if (state.skills) this.skills = [...state.skills];
        if (state.tempMana) this.tempMana = [...state.tempMana];
        if (state.units) this.units = state.units as Unit[];
        // Restore equipped artifact
        if (state.equippedArtifact) {
            const def = findCardDefinition(state.equippedArtifact);
            if (def) {
                this.equippedArtifact = new Card(def);
                // Apply passive effects on load
                this.applyArtifactEffects(this.equippedArtifact.basicEffect);
            }
        }
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

    /**
     * Pain Weave (Arythea): +1 attack per wound the hero carries, capped at
     * `value` (3). Wounds change mid-turn (blood_rage, dark_pact, damage), so
     * this is a getter the combat engine asks for at resolution time — never a
     * value armed once per turn.
     */
    getPainWeaveBonus(): number {
        if (!this.hasSkill('pain_weave')) return 0;
        const skill = this.skills.find((s: Skill) => s.id === 'pain_weave');
        const cap = skill?.value ?? 3;
        return Math.min(this.wounds.length, cap);
    }

    /**
     * Bulwark (Tovak): +1 armor against ranged and siege attacks. The engine
     * has no ranged attack *against* the hero, so the rule is read as "armor
     * against non-physical attackers" — a ranged/elemental enemy attack.
     */
    getArmorAgainst(attackType: string): number {
        let armor = this.armor;
        if (attackType !== 'physical' && this.hasSkill('bulwark')) {
            const skill = this.skills.find((s: Skill) => s.id === 'bulwark');
            armor += skill?.value ?? 1;
        }
        return armor;
    }

    /**
     * Crystal Mastery (Goldyx): 1 green crystal at the start of every round.
     */
    applyCrystalMastery(): void {
        if (!this.hasSkill('crystal_mastery')) return;
        const skill = this.skills.find((s: Skill) => s.id === 'crystal_mastery');
        this.gainCrystals('green', skill?.value ?? 1);
    }

    /**
     * Chaos Embrace (Arythea): the hero suffers one fewer wound per combat.
     */
    getChaosEmbraceReduction(): number {
        if (!this.hasSkill('chaos_embrace')) return 0;
        const skill = this.skills.find((s: Skill) => s.id === 'chaos_embrace');
        return skill?.value ?? 1;
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
        if (!Object.values(MANA_COLORS).includes(color)) {
            return false;
        }
        this.tempMana.push(color);
        this.syncStore();
        return true;
    }

    addMana(color: ManaColor): boolean {
        if (!Object.values(MANA_COLORS).includes(color)) {
            return false;
        }
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
