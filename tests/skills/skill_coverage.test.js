/**
 * Hero skills: declared in `js/skills/skillDefinitions.ts`, applied by the engine.
 *
 * Ten of the sixteen declared skills had no reader anywhere in `js/` — the hero
 * showed them in the skill bar and clicking one answered
 * "Fertigkeitseffekt nicht implementiert". Arythea and Tovak had *no* working
 * skill at all.
 *
 * This suite is the guard that keeps that from coming back: it scans the real
 * source of `js/` for every declared skill id, exactly like
 * `tests/card/card_effects_applied.test.js` does for card effect keys.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HERO_SKILLS, SKILLS } from '../../js/skills/skillDefinitions';
import { Hero } from '../../js/hero';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const JS_DIR = path.join(ROOT, 'js');

/** Every declared skill id, across all hero groups. */
function declaredSkillIds() {
    const ids = new Set();
    for (const group of Object.values(HERO_SKILLS)) {
        for (const skill of group.common) ids.add(skill.id);
    }
    return [...ids].sort();
}

function declaredSkill(id) {
    return Object.values(HERO_SKILLS)
        .flatMap((g) => g.common)
        .find((s) => s.id === id);
}

/**
 * All `.ts`/`.js` files under `js/` except the definitions themselves, with
 * their source. The definitions file is excluded because an id there is a
 * declaration, not a use.
 */
function engineSources() {
    const out = [];

    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
                continue;
            }
            if (!/\.(ts|js)$/.test(entry.name)) continue;
            if (entry.name === 'skillDefinitions.ts') continue;
            if (entry.name.includes('.test.')) continue;
            out.push(fs.readFileSync(full, 'utf8'));
        }
    };

    walk(JS_DIR);
    return out;
}

/** Hero with a single skill, via the real Hero path. */
function heroWith(skillId, heroName = 'ARYTHEA') {
    const hero = new Hero(heroName);
    const def = declaredSkill(skillId);
    hero.addSkill({ ...def });
    return hero;
}

describe('skill coverage — no declared skill is silently dead', () => {
    it('every declared skill id is read somewhere in js/', () => {
        const sources = engineSources();
        const missing = declaredSkillIds().filter(
            (id) => !sources.some((src) => src.includes(`'${id}'`) || src.includes(`"${id}"`))
        );

        expect(missing).toEqual([]);
    });

    it('every active skill has a case in HeroController.useActiveSkill', () => {
        const controller = fs.readFileSync(
            path.join(JS_DIR, 'game/HeroController.ts'),
            'utf8'
        );
        const handled = new Set(
            [...controller.matchAll(/case '([a-z_]+)'/g)].map((m) => m[1])
        );

        const unhandled = declaredSkillIds()
            .filter((id) => declaredSkill(id)?.type === 'active')
            .filter((id) => !handled.has(id));

        expect(unhandled).toEqual([]);
    });

    it('the uppercase mirror table exposes the same skills', () => {
        for (const [key, group] of Object.entries(HERO_SKILLS)) {
            expect(SKILLS[key.toUpperCase()]).toHaveLength(group.common.length);
        }
    });

    it('every skill with a fixed magnitude declares it', () => {
        // `motivation` is state-dependent: for Goldyx it draws 2 cards, for
        // everyone else it refreshes a spent unit — no single value describes it.
        const CONDITIONAL = ['motivation'];

        const withoutValue = declaredSkillIds()
            .filter((id) => !CONDITIONAL.includes(id))
            .filter((id) => typeof declaredSkill(id)?.value !== 'number');

        expect(withoutValue).toEqual([]);
    });
});

describe('the skills that used to be dead', () => {
    it('crystal_mastery grants a green crystal each round', () => {
        const hero = heroWith('crystal_mastery', 'GOLDYX');
        const before = hero.crystals.green ?? 0;

        hero.prepareNewRound();

        expect(hero.crystals.green).toBeGreaterThanOrEqual(before + 1);
    });

    it('crystal_mastery does nothing for a hero without it', () => {
        const hero = new Hero('ARYTHEA');
        hero.prepareNewRound();

        expect(hero.crystals.green ?? 0).toBe(0);
    });

    it('pain_weave scales with wounds and caps at the declared value', () => {
        const hero = heroWith('pain_weave');

        expect(hero.getPainWeaveBonus()).toBe(0);

        hero.takeWound();
        hero.takeWound();
        expect(hero.getPainWeaveBonus()).toBe(2);

        hero.takeWound();
        hero.takeWound();
        hero.takeWound();
        hero.takeWound();
        expect(hero.getPainWeaveBonus()).toBe(3); // capped at the declared value
    });

    it('chaos_embrace reports one wound of reduction', () => {
        const hero = heroWith('chaos_embrace');
        expect(hero.getChaosEmbraceReduction()).toBe(1);
    });

    it('bulwark adds armor only against non-physical attackers', () => {
        const hero = heroWith('bulwark', 'TOVAK');
        const base = hero.armor;

        expect(hero.getArmorAgainst('physical')).toBe(base);
        expect(hero.getArmorAgainst('fire')).toBe(base + 1);
        expect(hero.getArmorAgainst('ice')).toBe(base + 1);
    });

    it('healing_touch removes the wound card from the hand as well', () => {
        const hero = heroWith('healing_touch', 'NOROWAS');
        hero.takeWound();
        hero.takeWound();
        const handBefore = hero.hand.filter((c) => c.isWound()).length;

        let healed = 0;
        while (healed < 2 && hero.wounds.length > 0) {
            if (hero.healWound(false)) healed++;
            else break;
        }

        expect(healed).toBe(2);
        expect(hero.wounds).toHaveLength(0);
        // the wound cards are gone from the hand too — no orphaned blocker
        expect(hero.hand.filter((c) => c.isWound()).length).toBe(handBefore - 2);
    });
});
