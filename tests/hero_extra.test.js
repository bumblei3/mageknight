import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hero } from '../js/hero.js';
import { MANA_COLORS } from '../js/constants.js';

/**
 * Extra coverage for js/hero.ts (the existing hero_*.test.js files already
 * cover most of it at ~77%; this adds the remaining public methods
 * not yet exercised: healWound (both modes), moveTo, gainFame/levelUp,
 * skills (add/use/canUse/dragon_scales armor), reputation, reset,
 * prepareNewRound (glittering_fortune), mana inventory, unit management,
 * recruit/learn/gain-card, crystals, mana spend, awardRandomArtifact.
 *
 * Cards are lightweight mocks with the methods Hero calls.
 */

function mockCard(over = {}) {
    return {
        id: 'mock', name: 'Mock', color: 'red', type: 'action',
        isWound: () => false,
        canPlaySideways: () => false,
        isArtifact: () => false,
        getEffect: () => ({ movement: 0, attack: 0, block: 0, influence: 0, healing: 0 }),
        basicEffect: { attack: 1 },
        strongEffect: {},
        clone: () => mockCard(over),
        ...over,
    };
}

describe('Hero - healing & movement', () => {
    let hero;
    beforeEach(() => { hero = new Hero('Goldyx'); });

    it('healWound returns false with no wounds', () => {
        expect(hero.healWound()).toBe(false);
        expect(hero.wounds).toHaveLength(0);
    });

    it('healWound removes a wound when available', () => {
        hero.takeWound();
        expect(hero.wounds).toHaveLength(1);
        const ok = hero.healWound(false);
        expect(ok).toBe(true);
        expect(hero.wounds).toHaveLength(0);
    });

    it('healWound returns false when no healing points', () => {
        hero.takeWound();
        hero.healingPoints = 0;
        expect(hero.healWound(true)).toBe(false);
        expect(hero.wounds).toHaveLength(1); // unchanged
    });

    it('healWound consumes a healing point when requested', () => {
        hero.takeWound();
        hero.healingPoints = 2;
        hero.healWound(true);
        expect(hero.healingPoints).toBe(1);
    });

    it('moveTo succeeds when enough movement points', () => {
        hero.movementPoints = 5;
        expect(hero.moveTo(3, 4, 2)).toBe(true);
        expect(hero.position).toEqual({ q: 3, r: 4 });
        expect(hero.movementPoints).toBe(3);
    });

    it('moveTo fails when not enough movement points', () => {
        hero.movementPoints = 1;
        expect(hero.moveTo(3, 4, 2)).toBe(false);
        expect(hero.position).toEqual({ q: 0, r: 0 });
    });
});

describe('Hero - fame & leveling', () => {
    let hero;
    beforeEach(() => { hero = new Hero('Goldyx'); });

    it('gainFame reports a level up at threshold', () => {
        const res = hero.gainFame(10); // level 2 at fame 10
        expect(res.leveledUp).toBe(true);
        expect(res.newLevel).toBe(2);
        expect(res.reward).toBe('skill_card');
        // note: gainFame only reports the level-up; hero.level is raised by levelUp()
    });

    it('gainFame does not level up below threshold', () => {
        const res = hero.gainFame(5);
        expect(res.leveledUp).toBe(false);
        expect(hero.fame).toBe(5);
    });

    it('levelUp increases commandLimit/armor on odd levels', () => {
        hero.level = 2;
        hero.levelUp();
        expect(hero.level).toBe(3);
        expect(hero.commandLimit).toBe(2);
        expect(hero.armor).toBe(3);
    });

    it('levelUp increases handLimit on even levels', () => {
        hero.level = 3;
        hero.levelUp();
        expect(hero.level).toBe(4);
        expect(hero.handLimit).toBe(6);
    });
});

describe('Hero - skills', () => {
    let hero;
    beforeEach(() => { hero = new Hero('Goldyx'); });

    it('addSkill adds and dragon_scales grants armor', () => {
        hero.armor = 2;
        hero.addSkill({ id: 'dragon_scales', name: 'Dragon Scales', type: 'passive' });
        expect(hero.hasSkill('dragon_scales')).toBe(true);
        expect(hero.armor).toBe(3);
    });

    it('canUseSkill false for missing/passive skills', () => {
        expect(hero.canUseSkill('missing')).toBe(false);
        hero.addSkill({ id: 'passive1', name: 'P', type: 'passive' });
        expect(hero.canUseSkill('passive1')).toBe(false);
    });

    it('useSkill marks active skill used', () => {
        hero.addSkill({ id: 'active1', name: 'A', type: 'active' });
        expect(hero.canUseSkill('active1')).toBe(true);
        expect(hero.useSkill('active1')).toBe(true);
        expect(hero.canUseSkill('active1')).toBe(false);
    });
});

describe('Hero - reputation', () => {
    let hero;
    beforeEach(() => { hero = new Hero('Goldyx'); });

    it('changeReputation clamps to [-7, 7]', () => {
        hero.changeReputation(20);
        expect(hero.reputation).toBe(7);
        hero.changeReputation(-30);
        expect(hero.reputation).toBe(-7);
    });

    it('getReputationModifier maps ranges', () => {
        hero.reputation = 3; expect(hero.getReputationModifier()).toBe(2);
        hero.reputation = 1; expect(hero.getReputationModifier()).toBe(1);
        hero.reputation = -5; expect(hero.getReputationModifier()).toBe(-2);
        hero.reputation = -2; expect(hero.getReputationModifier()).toBe(-1);
        hero.reputation = 0; expect(hero.getReputationModifier()).toBe(0);
    });
});

describe('Hero - reset & new round', () => {
    let hero;
    beforeEach(() => { hero = new Hero('Goldyx'); });

    it('reset restores defaults and redraws', () => {
        hero.gainFame(30);
        hero.takeWound();
        hero.reset();
        expect(hero.level).toBe(1);
        expect(hero.fame).toBe(0);
        expect(hero.wounds).toHaveLength(0);
        expect(hero.hand.length).toBeGreaterThan(0);
    });

    it('prepareNewRound reshuffles discard into deck', () => {
        // play all hand into discard
        const hand = [...hero.hand];
        hero.discard.push(...hand);
        hero.hand = [];
        hero.prepareNewRound();
        // deck should now contain the previously-discarded cards
        expect(hero.deck.length).toBeGreaterThan(0);
    });

    it('prepareNewRound grants a crystal for glittering_fortune', () => {
        hero.addSkill({ id: 'glittering_fortune', name: 'Glittering Fortune', type: 'passive' });
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
        const before = Object.values(hero.crystals).reduce((a, b) => a + b, 0);
        hero.prepareNewRound();
        const after = Object.values(hero.crystals).reduce((a, b) => a + b, 0);
        expect(after).toBeGreaterThan(before);
        spy.mockRestore();
    });

    it('prepareNewRound clears used skills', () => {
        hero.addSkill({ id: 'active1', name: 'A', type: 'active' });
        hero.useSkill('active1');
        expect(hero.usedSkills.has('active1')).toBe(true);
        hero.prepareNewRound();
        expect(hero.usedSkills.has('active1')).toBe(false);
    });
});

describe('Hero - mana inventory & state', () => {
    let hero;
    beforeEach(() => { hero = new Hero('Goldyx'); });

    it('getManaInventory merges tempMana + crystals', () => {
        hero.tempMana = [MANA_COLORS.RED];
        hero.crystals = { red: 2, blue: 0, white: 0, green: 0 };
        const inv = hero.getManaInventory();
        expect(inv).toContain(MANA_COLORS.RED);
        expect(inv.filter(c => c === MANA_COLORS.RED).length).toBe(3);
    });

    it('getState/loadState round-trip preserves identity', () => {
        hero.gainFame(30);
        hero.levelUp();
        hero.takeWound();
        const state = hero.getState();
        const hero2 = new Hero('Norowas');
        hero2.loadState(state);
        expect(hero2.fame).toBe(hero.fame);
        expect(hero2.level).toBe(hero.level);
        expect(hero2.wounds.length).toBe(hero.wounds.length);
    });

    it('loadState ignores null', () => {
        const h = new Hero('Goldyx');
        h.fame = 99;
        h.loadState(null);
        expect(h.fame).toBe(99);
    });

    it('addCardToDeck unshifts a clone', () => {
        const card = mockCard({ id: 'x' });
        const len = hero.deck.length;
        hero.addCardToDeck(card);
        expect(hero.deck.length).toBe(len + 1);
        expect(hero.deck[0].id).toBe('x');
    });
});

describe('Hero - units', () => {
    let hero;
    beforeEach(() => { hero = new Hero('Goldyx'); });

    const unit = (id) => ({ id, getName: () => id, getState: () => ({ id }), refresh: vi.fn() });

    it('addUnit respects command limit', () => {
        expect(hero.addUnit(unit('u1'))).toBe(true);
        expect(hero.units).toHaveLength(1);
        // commandLimit is 1 by default
        expect(hero.addUnit(unit('u2'))).toBe(false);
        expect(hero.units).toHaveLength(1);
    });

    it('removeUnit by index', () => {
        hero.addUnit(unit('u1'));
        const removed = hero.removeUnit(0);
        expect(removed?.id).toBe('u1');
        expect(hero.units).toHaveLength(0);
    });

    it('removeUnit out of range returns null', () => {
        expect(hero.removeUnit(5)).toBeNull();
    });

    it('refreshUnits refreshes each unit', () => {
        const u = unit('u1');
        hero.addUnit(u);
        hero.refreshUnits();
        expect(u.refresh).toHaveBeenCalled();
    });
});

describe('Hero - recruit / learn / gain', () => {
    let hero;
    beforeEach(() => { hero = new Hero('Goldyx'); });

    it('recruitUnit fails without influence', () => {
        const res = hero.recruitUnit({ getName: () => 'Guard', getState: () => ({}) }, 5);
        expect(res.success).toBe(false);
    });

    it('recruitUnit succeeds with influence', () => {
        hero.influencePoints = 5;
        const res = hero.recruitUnit({ getName: () => 'Guard', getState: () => ({}) }, 3);
        expect(res.success).toBe(true);
        expect(hero.units).toHaveLength(1);
        expect(hero.influencePoints).toBe(2);
    });

    it('learnSpell fails without influence', () => {
        const res = hero.learnSpell(mockCard({ id: 's' }), 3);
        expect(res.success).toBe(false);
    });

    it('learnSpell succeeds and discards the card', () => {
        hero.influencePoints = 3;
        const card = mockCard({ id: 's' });
        const res = hero.learnSpell(card, 2);
        expect(res.success).toBe(true);
        expect(hero.discard).toContain(card);
    });

    it('learnAdvancedAction discards the card on success', () => {
        hero.influencePoints = 5;
        const card = mockCard({ id: 'aa' });
        const res = hero.learnAdvancedAction(card, 2);
        expect(res.success).toBe(true);
        expect(hero.discard).toContain(card);
    });

    it('gainCardToHand pushes onto hand', () => {
        const card = mockCard({ id: 'c' });
        const res = hero.gainCardToHand(card);
        expect(res.success).toBe(true);
        expect(hero.hand).toContain(card);
    });
});

describe('Hero - crystals & mana', () => {
    let hero;
    beforeEach(() => { hero = new Hero('Goldyx'); });

    it('addCrystal caps at 3', () => {
        expect(hero.addCrystal(MANA_COLORS.RED)).toBe(true);
        hero.addCrystal(MANA_COLORS.RED);
        hero.addCrystal(MANA_COLORS.RED);
        expect(hero.crystals.red).toBe(3);
        expect(hero.addCrystal(MANA_COLORS.RED)).toBe(false);
    });

    it('addCrystal rejects unknown color', () => {
        expect(hero.addCrystal('purple')).toBe(false);
    });

    it('useCrystal decrements', () => {
        hero.addCrystal(MANA_COLORS.BLUE);
        expect(hero.useCrystal(MANA_COLORS.BLUE)).toBe(true);
        expect(hero.crystals.blue).toBe(0);
        expect(hero.useCrystal(MANA_COLORS.BLUE)).toBe(false);
    });

    it('takeManaFromSource pushes to tempMana', () => {
        hero.takeManaFromSource(MANA_COLORS.GREEN);
        expect(hero.tempMana).toContain(MANA_COLORS.GREEN);
    });

    it('hasMana checks tempMana incl. gold by day', () => {
        hero.tempMana = [MANA_COLORS.RED];
        expect(hero.hasMana(MANA_COLORS.RED)).toBe(true);
        expect(hero.hasMana(MANA_COLORS.BLUE)).toBe(false);
        // gold stands in for any color during day
        hero.tempMana = [MANA_COLORS.GOLD];
        expect(hero.hasMana(MANA_COLORS.WHITE, false)).toBe(true);
        // at night gold does not satisfy a specific color
        expect(hero.hasMana(MANA_COLORS.WHITE, true)).toBe(false);
    });

    it('canAffordMana true for zero-cost cards', () => {
        const free = mockCard({ color: null, type: 'action', manaCost: 0 });
        expect(hero.canAffordMana(free)).toBe(true);
    });

    it('canAffordMana checks card color in tempMana', () => {
        const costly = mockCard({ color: 'blue', type: 'spell' });
        hero.tempMana = [MANA_COLORS.RED];
        expect(hero.canAffordMana(costly)).toBe(false);
        hero.tempMana = [MANA_COLORS.BLUE];
        expect(hero.canAffordMana(costly)).toBe(true);
    });

    it('spendMana spends from tempMana', () => {
        hero.tempMana = [MANA_COLORS.RED];
        expect(hero.spendMana(MANA_COLORS.RED)).toBe(true);
        expect(hero.tempMana).not.toContain(MANA_COLORS.RED);
    });

    it('spendMana falls back to gold during day', () => {
        hero.tempMana = [MANA_COLORS.GOLD];
        expect(hero.spendMana(MANA_COLORS.BLUE)).toBe(true);
        expect(hero.tempMana).not.toContain(MANA_COLORS.GOLD);
    });

    it('clearTempMana empties it', () => {
        hero.tempMana = [MANA_COLORS.RED, MANA_COLORS.BLUE];
        hero.clearTempMana();
        expect(hero.tempMana).toHaveLength(0);
    });

    it('awardRandomArtifact pushes a card to discard', () => {
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const before = hero.discard.length;
        hero.awardRandomArtifact();
        expect(hero.discard.length).toBe(before + 1);
        spy.mockRestore();
    });
});

describe('Hero - artifacts', () => {
    let hero;
    beforeEach(() => { hero = new Hero('Goldyx'); });

    it('equipArtifact requires an artifact card', () => {
        const notArtifact = mockCard({ isArtifact: () => false });
        hero.hand.push(notArtifact);
        expect(hero.equipArtifact(hero.hand.length - 1)).toBe(false);
    });

    it('equipArtifact applies passive effect and returns true', () => {
        const art = mockCard({
            id: 'a1', isArtifact: () => true,
            basicEffect: { attack: 2 }, strongEffect: { block: 3 },
        });
        hero.hand.push(art);
        const idx = hero.hand.length - 1;
        const atkBefore = hero.attackPoints;
        expect(hero.equipArtifact(idx)).toBe(true);
        expect(hero.getEquippedArtifact()).toBe(art);
        expect(hero.attackPoints).toBe(atkBefore + 2);
        expect(hero.hand).not.toContain(art);
    });

    it('equipArtifact unequips previously equipped first', () => {
        const art1 = mockCard({ id: 'a1', isArtifact: () => true, basicEffect: { attack: 1 }, strongEffect: {} });
        const art2 = mockCard({ id: 'a2', isArtifact: () => true, basicEffect: { block: 1 }, strongEffect: {} });
        hero.hand.push(art1);
        hero.equipArtifact(hero.hand.length - 1);
        hero.hand.push(art2);
        hero.equipArtifact(hero.hand.length - 1);
        // art1 should be back in hand
        expect(hero.hand).toContain(art1);
        expect(hero.getEquippedArtifact()).toBe(art2);
    });

    it('useArtifactStrongEffect requires an equipped artifact', () => {
        const res = hero.useArtifactStrongEffect();
        expect(res.success).toBe(false);
        expect(res.message).toContain('Kein');
    });

    it('useArtifactStrongEffect requires a strong effect', () => {
        const art = mockCard({ id: 'a1', isArtifact: () => true, basicEffect: { attack: 1 }, strongEffect: {} });
        hero.hand.push(art);
        hero.equipArtifact(hero.hand.length - 1);
        const res = hero.useArtifactStrongEffect();
        expect(res.success).toBe(false);
        expect(res.message).toContain('starken');
    });

    it('useArtifactStrongEffect applies strong effect and unequips', () => {
        const art = mockCard({ id: 'a1', name: 'Amulet', isArtifact: () => true, basicEffect: { attack: 1 }, strongEffect: { block: 5 } });
        hero.hand.push(art);
        hero.equipArtifact(hero.hand.length - 1);
        const res = hero.useArtifactStrongEffect();
        expect(res.success).toBe(true);
        expect(res.message).toContain('Amulet');
        expect(hero.getEquippedArtifact()).toBeNull();
        expect(hero.blockPoints).toBe(5);
    });

    it('unequipArtifact returns null when nothing equipped', () => {
        expect(hero.unequipArtifact()).toBeNull();
    });

    it('unequipArtifact returns artifact to hand and removes effects', () => {
        const art = mockCard({ id: 'a1', isArtifact: () => true, basicEffect: { attack: 2 }, strongEffect: {} });
        hero.hand.push(art);
        hero.equipArtifact(hero.hand.length - 1);
        const atkWith = hero.attackPoints;
        const returned = hero.unequipArtifact();
        expect(returned).toBe(art);
        expect(hero.getEquippedArtifact()).toBeNull();
        expect(hero.attackPoints).toBe(atkWith - 2);
        expect(hero.hand).toContain(art);
    });
});

describe('Hero - card play', () => {
    let hero;
    beforeEach(() => { hero = new Hero('Goldyx'); });

    it('playCard applies effect and moves to discard', () => {
        const card = mockCard({
            id: 'c1', color: 'red', type: 'action',
            getEffect: () => ({ attack: 4, block: 0, movement: 0, influence: 0, healing: 0 }),
        });
        hero.hand.push(card);
        const idx = hero.hand.length - 1;
        const res = hero.playCard(idx);
        expect(res).not.toBeNull();
        expect(res.card).toBe(card);
        expect(hero.attackPoints).toBe(4);
        expect(hero.discard).toContain(card);
    });

    it('playCard returns null for out-of-range index', () => {
        expect(hero.playCard(99)).toBeNull();
    });

    it('playCard with strong spends matching mana', () => {
        hero.tempMana = [MANA_COLORS.RED];
        const card = mockCard({
            id: 'c2', color: 'red', type: 'action',
            getEffect: () => ({ attack: 2 }),
        });
        hero.hand.push(card);
        const res = hero.playCard(hero.hand.length - 1, true);
        expect(res).not.toBeNull();
        expect(hero.tempMana).not.toContain(MANA_COLORS.RED);
    });

    it('playCard with strong returns null when mana missing', () => {
        hero.tempMana = [MANA_COLORS.BLUE];
        const card = mockCard({ id: 'c3', color: 'red', type: 'action' });
        hero.hand.push(card);
        expect(hero.playCard(hero.hand.length - 1, true)).toBeNull();
    });

    it('playCardSideways requires a sideways-playable card', () => {
        const card = mockCard({ id: 'c4', canPlaySideways: () => true });
        hero.hand.push(card);
        const res = hero.playCardSideways(hero.hand.length - 1, 'movement');
        expect(res).not.toBeNull();
        expect(hero.movementPoints).toBe(1);
    });

    it('playCardSideways returns null for non-sideways cards', () => {
        const card = mockCard({ id: 'c5', canPlaySideways: () => false });
        hero.hand.push(card);
        expect(hero.playCardSideways(hero.hand.length - 1, 'movement')).toBeNull();
    });

    it('playCardSideways returns null for out-of-range index', () => {
        expect(hero.playCardSideways(99, 'attack')).toBeNull();
    });

    it('discardCard removes by index', () => {
        const card = mockCard({ id: 'c6' });
        hero.hand.push(card);
        const removed = hero.discardCard(hero.hand.length - 1);
        expect(removed).toBe(card);
        expect(hero.discard).toContain(card);
    });

    it('discardNonWoundCards skips wounds', () => {
        const wound = mockCard({ id: 'w', isWound: () => true });
        const normal = mockCard({ id: 'n', isWound: () => false });
        hero.hand.push(wound, normal);
        const count = hero.discardNonWoundCards(5);
        expect(count).toBe(1);
        expect(hero.hand).toContain(wound);
        expect(hero.hand).not.toContain(normal);
    });

    it('rest discards given cards and redraws', () => {
        const c1 = mockCard({ id: 'r1' });
        const c2 = mockCard({ id: 'r2' });
        hero.hand.push(c1, c2);
        const idx1 = hero.hand.indexOf(c1);
        const idx2 = hero.hand.indexOf(c2);
        hero.rest([idx1, idx2]);
        expect(hero.discard).toContain(c1);
        expect(hero.discard).toContain(c2);
        expect(hero.hand.length).toBeGreaterThan(0);
    });

    it('endTurn discards hand, resets points, redraws, applies noble_manners', () => {
        const e1 = mockCard({ id: 'e1' });
        hero.hand.push(e1);
        hero.movementPoints = 3;
        hero.addSkill({ id: 'noble_manners', name: 'Noble Manners', type: 'passive' });
        hero.endTurn();
        expect(hero.discard).toContain(e1); // e1 discarded
        expect(hero.movementPoints).toBe(0); // reset
        expect(hero.influencePoints).toBe(2); // noble_manners
        expect(hero.hand.length).toBeGreaterThan(0); // redrawn
    });
});

describe('Hero - status', () => {
    let hero;
    beforeEach(() => { hero = new Hero('Goldyx'); });

    it('add/remove/has status', () => {
        hero.addStatus('blessed');
        expect(hero.hasStatus('blessed')).toBe(true);
        hero.removeStatus('blessed');
        expect(hero.hasStatus('blessed')).toBe(false);
    });

    it('getStats returns a snapshot', () => {
        const stats = hero.getStats();
        expect(stats.name).toBe('Goldyx');
        expect(stats.armor).toBeGreaterThanOrEqual(0);
        expect(stats.deckSize).toBe(hero.deck.length);
    });
});
