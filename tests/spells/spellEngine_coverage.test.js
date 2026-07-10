/**
 * SpellEngine - Coverage Boost
 * Targets uncovered lines and functions in js/combat/SpellEngine.ts (was 0%).
 * Covers all 7 spell types + guards + static helpers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpellEngine } from '../../js/combat/SpellEngine.js';

// --- helpers to build a controllable game mock -------------------------

function makeEnemy(overrides = {}) {
    return {
        id: overrides.id || 'e1',
        name: overrides.name || 'Goblin',
        armor: overrides.armor ?? 2,
        armorBonus: 0,
        fireStacks: 0,
        iceStacks: 0,
        slowed: false,
        attackDebuff: 0,
        getResistanceMultiplier: overrides.getResistanceMultiplier || (() => 1),
        ...overrides,
    };
}

function makeHero(overrides = {}) {
    return {
        attackPoints: 0,
        buffTurns: 0,
        wounds: overrides.wounds ?? [],
        healWound: overrides.healWound || vi.fn(() => false),
        drawCards: overrides.drawCards || vi.fn(() => []),
        addCrystal: overrides.addCrystal || vi.fn(() => true),
        ...overrides,
    };
}

function makeGame({ hero = makeHero(), enemies = [makeEnemy()], blocked = new Set() } = {}) {
    return {
        addLog: vi.fn(),
        hero,
        combat: {
            enemies,
            blockedEnemies: blocked,
        },
        combatRangedTotal: 0,
    };
}

// A card whose effect is produced by getEffect; supports useStrong.
function makeCard(effect, name = 'TestSpell') {
    return {
        name,
        getEffect: (strong) => {
            if (!effect) return undefined;
            if (strong && effect.strongValue !== undefined) {
                return { ...effect, value: effect.strongValue };
            }
            return effect;
        },
    };
}

// --- tests --------------------------------------------------------------

describe('SpellEngine - Coverage Boost', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('castSpell guards', () => {
        it('returns failure when no card is given', () => {
            const engine = new SpellEngine(makeGame());
            const res = engine.castSpell(null);
            expect(res.success).toBe(false);
            expect(res.message).toBe('Keine Karte');
        });

        it('returns failure when effect is missing', () => {
            const engine = new SpellEngine(makeGame());
            const res = engine.castSpell(makeCard(null));
            expect(res.success).toBe(false);
            expect(res.message).toBe('Kein Spell-Effekt');
        });

        it('falls back to basicEffect when getEffect is absent', () => {
            const game = makeGame();
            const engine = new SpellEngine(game);
            // basicEffect without getEffect: spellType + value are read from it
            const card = { name: 'Plain', basicEffect: { spellType: 'direct_damage', value: 3 } };
            const res = engine.castSpell(card);
            expect(res.success).toBe(true);
            expect(res.damageDealt).toBe(3);
        });

        it('REGRESSION: direct_damage uses effect.attack when value is missing', () => {
            // Bug: attack-based spell effects routed to direct_damage but damage
            // was read from effect.value (undefined) -> 0 damage. Must use attack.
            const game = makeGame();
            const engine = new SpellEngine(game);
            const card = { name: 'Bolt', getEffect: () => ({ spellType: 'direct_damage', attack: 5 }) };
            const res = engine.castSpell(card);
            expect(res.success).toBe(true);
            expect(res.damageDealt).toBe(5);
        });

        it('REGRESSION: area_damage uses effect.attack when value is missing', () => {
            const e1 = makeEnemy({ name: 'A' });
            const e2 = makeEnemy({ name: 'B' });
            const game = makeGame({ enemies: [e1, e2] });
            const engine = new SpellEngine(game);
            const card = { name: 'Blast', getEffect: () => ({ spellType: 'area_damage', attack: 4 }) };
            const res = engine.castSpell(card);
            expect(res.success).toBe(true);
            expect(res.damageDealt).toBe(8); // 4 * 2 enemies
        });
    });

    describe('detectSpellType', () => {
        const engine = new SpellEngine(null);

        it('prefers explicit spellType', () => {
            expect(engine.detectSpellType({ spellType: 'heal', attack: 5 })).toBe('heal');
        });
        it('detects heal when healing and no attack', () => {
            expect(engine.detectSpellType({ healing: 2 })).toBe('heal');
        });
        it('detects draw', () => {
            expect(engine.detectSpellType({ draw: 1 })).toBe('draw');
        });
        it('detects mana_drain', () => {
            expect(engine.detectSpellType({ manaDrain: 1 })).toBe('mana_drain');
        });
        it('detects buff', () => {
            expect(engine.detectSpellType({ buff: 1 })).toBe('buff');
        });
        it('detects debuff', () => {
            expect(engine.detectSpellType({ debuff: 1 })).toBe('debuff');
        });
        it('detects area_damage when attack and aoe', () => {
            expect(engine.detectSpellType({ attack: 2, aoe: true })).toBe('area_damage');
        });
        it('detects direct_damage when attack only', () => {
            expect(engine.detectSpellType({ attack: 2 })).toBe('direct_damage');
        });
        it('returns unknown for unrecognized effect', () => {
            expect(engine.detectSpellType({ foo: 1 })).toBe('unknown');
        });
    });

    describe('castDirectDamage', () => {
        it('deals damage ignoring armor and logs', () => {
            const game = makeGame();
            const engine = new SpellEngine(game);
            const res = engine.castSpell(makeCard({ spellType: 'direct_damage', value: 4 }));
            expect(res.success).toBe(true);
            expect(res.damageDealt).toBe(4);
            expect(res.targetsAffected).toEqual(['Goblin']);
            expect(game.addLog).toHaveBeenCalled();
        });

        it('applies fire stacks and reduces armor (clamped at 0)', () => {
            const enemy = makeEnemy({ armor: 2 });
            const game = makeGame({ enemies: [enemy] });
            const engine = new SpellEngine(game);
            engine.castSpell(makeCard({ spellType: 'direct_damage', value: 5, element: 'fire' }));
            expect(enemy.fireStacks).toBe(5);
            expect(enemy.armorBonus).toBe(-2); // clamped to -armor
        });

        it('applies ice stacks and slows the target', () => {
            const enemy = makeEnemy({ armor: 10 });
            const game = makeGame({ enemies: [enemy] });
            const engine = new SpellEngine(game);
            engine.castSpell(makeCard({ spellType: 'direct_damage', value: 3, element: 'ice' }));
            expect(enemy.iceStacks).toBe(3);
            expect(enemy.slowed).toBe(true);
            expect(enemy.armorBonus).toBe(-3);
        });

        it('targets a non-blocked enemy when available', () => {
            const a = makeEnemy({ id: 'a', name: 'Blocked' });
            const b = makeEnemy({ id: 'b', name: 'Free' });
            const game = makeGame({ enemies: [a, b], blocked: new Set(['a']) });
            const engine = new SpellEngine(game);
            const res = engine.castSpell(makeCard({ spellType: 'direct_damage', value: 2 }));
            expect(res.targetsAffected).toEqual(['Free']);
        });

        it('fails without any enemy target', () => {
            const game = makeGame({ enemies: [] });
            const engine = new SpellEngine(game);
            const res = engine.castSpell(makeCard({ spellType: 'direct_damage', value: 2 }));
            expect(res.success).toBe(false);
            expect(res.message).toBe('Kein Ziel');
        });
    });

    describe('castAreaDamage', () => {
        it('hits all enemies and reports total damage', () => {
            const e1 = makeEnemy({ name: 'A' });
            const e2 = makeEnemy({ name: 'B' });
            const game = makeGame({ enemies: [e1, e2] });
            const engine = new SpellEngine(game);
            const res = engine.castSpell(makeCard({ spellType: 'area_damage', value: 3 }));
            expect(res.success).toBe(true);
            expect(res.damageDealt).toBe(6);
            expect(res.targetsAffected).toEqual(['A', 'B']);
        });

        it('applies resistance multiplier per enemy', () => {
            const e1 = makeEnemy({ name: 'R', getResistanceMultiplier: () => 2 });
            const game = makeGame({ enemies: [e1] });
            const engine = new SpellEngine(game);
            engine.castSpell(makeCard({ spellType: 'area_damage', value: 3, element: 'fire' }));
            expect(e1.fireStacks).toBe(6); // ceil(3*2)
        });

        it('applies ice stacks and slows all enemies in area damage', () => {
            const e1 = makeEnemy({ name: 'R', armor: 10 });
            const game = makeGame({ enemies: [e1] });
            const engine = new SpellEngine(game);
            engine.castSpell(makeCard({ spellType: 'area_damage', value: 3, element: 'ice' }));
            expect(e1.iceStacks).toBe(3);
            expect(e1.slowed).toBe(true);
        });

        it('fails without enemies', () => {
            const game = makeGame({ enemies: [] });
            const engine = new SpellEngine(game);
            const res = engine.castSpell(makeCard({ spellType: 'area_damage', value: 3 }));
            expect(res.success).toBe(false);
            expect(res.message).toBe('Keine Ziele');
        });
    });

    describe('castHeal', () => {
        it('heals available wounds', () => {
            const hero = makeHero({ wounds: [{ id: 1 }, { id: 2 }], healWound: vi.fn(() => true) });
            const game = makeGame({ hero });
            const engine = new SpellEngine(game);
            const res = engine.castSpell(makeCard({ spellType: 'heal', value: 2 }));
            expect(res.success).toBe(true);
            expect(res.healingDone).toBe(2);
            expect(hero.healWound).toHaveBeenCalledWith(false);
        });

        it('stops early when no more wounds', () => {
            const hero = makeHero({ wounds: [{ id: 1 }], healWound: vi.fn().mockReturnValueOnce(true).mockReturnValue(false) });
            const game = makeGame({ hero });
            const engine = new SpellEngine(game);
            const res = engine.castSpell(makeCard({ spellType: 'heal', value: 5 }));
            expect(res.success).toBe(true); // healed at least 1
            expect(res.healingDone).toBe(1);
            expect(res.message).toBe('Heilung! 1 Wunden geheilt');
        });

        it('fails without a hero', () => {
            const engine = new SpellEngine({ addLog: vi.fn(), combat: { enemies: [] } });
            const res = engine.castSpell(makeCard({ spellType: 'heal', value: 1 }));
            expect(res.success).toBe(false);
            expect(res.message).toBe('Kein Held');
        });
    });

    describe('castDraw', () => {
        it('draws cards', () => {
            const hero = makeHero({ drawCards: vi.fn(() => [{ id: 'c1' }, { id: 'c2' }]) });
            const game = makeGame({ hero });
            const engine = new SpellEngine(game);
            const res = engine.castSpell(makeCard({ spellType: 'draw', value: 2 }));
            expect(res.success).toBe(true);
            expect(res.cardsDrawn).toBe(2);
        });

        it('reports empty deck', () => {
            const hero = makeHero({ drawCards: vi.fn(() => []) });
            const game = makeGame({ hero });
            const engine = new SpellEngine(game);
            const res = engine.castSpell(makeCard({ spellType: 'draw', value: 2 }));
            expect(res.success).toBe(false);
            expect(res.message).toBe('Keine Karten mehr im Deck');
        });

        it('fails without a hero', () => {
            const engine = new SpellEngine({ addLog: vi.fn(), combat: { enemies: [] } });
            const res = engine.castSpell(makeCard({ spellType: 'draw', value: 1 }));
            expect(res.success).toBe(false);
            expect(res.message).toBe('Kein Held');
        });
    });

    describe('castManaDrain', () => {
        it('steals mana from enemies', () => {
            const hero = makeHero({ addCrystal: vi.fn(() => true) });
            const game = makeGame({ hero, enemies: [makeEnemy()] });
            const engine = new SpellEngine(game);
            const res = engine.castSpell(makeCard({ spellType: 'mana_drain', value: 3 }));
            expect(res.success).toBe(true);
            expect(res.manaGained).toBe(3);
            expect(hero.addCrystal).toHaveBeenCalledTimes(3);
        });

        it('reflects partial success when crystals cap out', () => {
            let calls = 0;
            const hero = makeHero({ addCrystal: vi.fn(() => { calls += 1; return calls <= 1; }) });
            const game = makeGame({ hero, enemies: [makeEnemy()] });
            const engine = new SpellEngine(game);
            const res = engine.castSpell(makeCard({ spellType: 'mana_drain', value: 3 }));
            expect(res.manaGained).toBe(1);
            expect(res.message).toBe('1 Mana erlangt');
        });

        it('fails without hero or enemies', () => {
            const engine = new SpellEngine({ addLog: vi.fn(), hero: null, combat: { enemies: [] } });
            const res = engine.castSpell(makeCard({ spellType: 'mana_drain', value: 1 }));
            expect(res.success).toBe(false);
            expect(res.message).toBe('Kein Ziel');
        });
    });

    describe('castBuff', () => {
        it('adds attack points and buff turns', () => {
            const hero = makeHero();
            const game = makeGame({ hero });
            const engine = new SpellEngine(game);
            const res = engine.castSpell(makeCard({ spellType: 'buff', value: 3, duration: 2 }));
            expect(res.success).toBe(true);
            expect(hero.attackPoints).toBe(3);
            expect(hero.buffTurns).toBe(2);
            expect(res.message).toContain('+3 Angriff');
        });

        it('defaults duration to 1 turn', () => {
            const hero = makeHero();
            const game = makeGame({ hero });
            const engine = new SpellEngine(game);
            engine.castSpell(makeCard({ spellType: 'buff', value: 1 }));
            expect(hero.buffTurns).toBe(1);
        });

        it('fails without a hero', () => {
            const engine = new SpellEngine({ addLog: vi.fn(), combat: { enemies: [] } });
            const res = engine.castSpell(makeCard({ spellType: 'buff', value: 1 }));
            expect(res.success).toBe(false);
            expect(res.message).toBe('Kein Held');
        });
    });

    describe('castDebuff', () => {
        it('reduces attack of all enemies', () => {
            const e1 = makeEnemy({ name: 'A' });
            const e2 = makeEnemy({ name: 'B' });
            const game = makeGame({ enemies: [e1, e2] });
            const engine = new SpellEngine(game);
            const res = engine.castSpell(makeCard({ spellType: 'debuff', value: 2 }));
            expect(res.success).toBe(true);
            expect(e1.attackDebuff).toBe(2);
            expect(e2.attackDebuff).toBe(2);
            expect(res.targetsAffected).toEqual(['A', 'B']);
        });

        it('fails without enemies', () => {
            const game = makeGame({ enemies: [] });
            const engine = new SpellEngine(game);
            const res = engine.castSpell(makeCard({ spellType: 'debuff', value: 2 }));
            expect(res.success).toBe(false);
            expect(res.message).toBe('Keine Ziele');
        });
    });

    describe('castBasicSpell (fallback)', () => {
        it('fails for unknown effect with no attack', () => {
            // detectSpellType returns 'unknown' for an effect with none of the type flags.
            const game = makeGame();
            const engine = new SpellEngine(game);
            const card = { name: 'Rock', getEffect: () => ({ foo: 1 }) };
            const res = engine.castSpell(card, false);
            expect(res.success).toBe(false);
            expect(res.message).toBe('Unbekannter Spell-Effekt');
        });
        it('covers castBasicSpell damage path via unknown routing (white-box)', () => {
            // Force the fallback by stubbing detectSpellType to 'unknown' for an attack effect.
            const game = makeGame();
            const engine = new SpellEngine(game);
            vi.spyOn(engine, 'detectSpellType').mockReturnValue('unknown');
            const card = { name: 'Dart', getEffect: () => ({ attack: 4 }) };
            const res = engine.castSpell(card, false);
            expect(res.success).toBe(true);
            expect(res.damageDealt).toBe(4);
            expect(game.combatRangedTotal).toBe(4);
        });

        it('covers castBasicSpell strong doubling via unknown routing (white-box)', () => {
            const game = makeGame();
            const engine = new SpellEngine(game);
            vi.spyOn(engine, 'detectSpellType').mockReturnValue('unknown');
            const card = { name: 'Dart', getEffect: () => ({ attack: 4, strongValue: 9 }) };
            const res = engine.castSpell(card, true);
            expect(res.damageDealt).toBe(9); // strongValue wins
        });

        it('covers castBasicSpell strong fallback doubling (x2) via unknown routing', () => {
            const game = makeGame();
            const engine = new SpellEngine(game);
            vi.spyOn(engine, 'detectSpellType').mockReturnValue('unknown');
            const card = { name: 'Dart', getEffect: () => ({ attack: 4 }) };
            const res = engine.castSpell(card, true);
            expect(res.damageDealt).toBe(8); // attack * 2 when no strongValue
        });

        it('fails when no combat present', () => {
            const engine = new SpellEngine({ addLog: vi.fn() });
            const card = { name: 'Rock', basicEffect: { foo: 1 } };
            const res = engine.castSpell(card, false);
            expect(res.success).toBe(false);
        });
    });

    describe('static isSpell', () => {
        it('recognizes spell and artifact cards', () => {
            expect(SpellEngine.isSpell({ type: 'spell' })).toBe(true);
            expect(SpellEngine.isSpell({ type: 'artifact' })).toBe(true);
            expect(SpellEngine.isSpell({ type: 'unit' })).toBe(false);
        });
    });

    describe('static getSpellDescription', () => {
        const card = (effect) => ({ name: 'X', getEffect: (s) => (s && effect.strongValue !== undefined ? { ...effect, value: effect.strongValue } : effect) });

        it('describes direct damage', () => {
            expect(SpellEngine.getSpellDescription(card({ spellType: 'direct_damage', value: 5 }))).toContain('direkter Schaden');
        });
        it('describes area damage', () => {
            expect(SpellEngine.getSpellDescription(card({ spellType: 'area_damage', value: 5 }))).toContain('Flächenschaden');
        });
        it('describes heal', () => {
            expect(SpellEngine.getSpellDescription(card({ spellType: 'heal', value: 3 }))).toContain('Heilt 3');
        });
        it('describes draw', () => {
            expect(SpellEngine.getSpellDescription(card({ spellType: 'draw', value: 2 }))).toContain('Ziehe 2');
        });
        it('describes mana drain', () => {
            expect(SpellEngine.getSpellDescription(card({ spellType: 'mana_drain', value: 2 }))).toContain('Erlange 2 Mana');
        });
        it('describes buff with duration', () => {
            expect(SpellEngine.getSpellDescription(card({ spellType: 'buff', value: 2, duration: 3 }))).toContain('+2 Angriff');
        });
        it('describes debuff', () => {
            expect(SpellEngine.getSpellDescription(card({ spellType: 'debuff', value: 2 }))).toContain('verlieren 2 Angriff');
        });
        it('returns card name for unknown', () => {
            expect(SpellEngine.getSpellDescription({ name: 'Mystery', getEffect: () => ({ foo: 1 }) })).toBe('Mystery');
        });
        it('returns Kein Effekt when effect missing', () => {
            expect(SpellEngine.getSpellDescription({ name: 'X', getEffect: () => undefined })).toBe('Kein Effekt');
        });
    });
});
