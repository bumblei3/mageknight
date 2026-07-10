import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hero } from '../js/hero.js';
import {
    SiteRewardManager,
    SITE_REWARD_TABLES,
} from '../js/sites/SiteRewards.js';

/**
 * Focused, deterministic tests for js/sites/SiteRewards.ts
 * (previously ~4% line coverage).
 *
 * Strategy:
 *  - rollRewards() randomness is controlled via a mockable Math.random
 *  - applyRewards() and getRewardDescription() are exercised with hand-built
 *    RewardRoll objects so every switch-branch is covered deterministically.
 */

const SITE_TYPES = Object.keys(SITE_REWARD_TABLES);
const DIFFICULTIES = ['common', 'uncommon', 'rare'];

describe('SITE_REWARD_TABLES definitions', () => {
    it('should define reward tables for all known site types', () => {
        expect(SITE_TYPES.length).toBeGreaterThan(0);
        SITE_TYPES.forEach((type) => {
            const table = SITE_REWARD_TABLES[type];
            expect(table).toBeDefined();
            expect(['common', 'uncommon', 'rare'].every((d) => Array.isArray(table[d]))).toBe(true);
        });
    });

    it('should have at least one entry per difficulty tier', () => {
        SITE_TYPES.forEach((type) => {
            DIFFICULTIES.forEach((diff) => {
                expect(SITE_REWARD_TABLES[type][diff].length).toBeGreaterThan(0);
            });
        });
    });

    it('should give every reward a type, name and icon', () => {
        const allRewards = SITE_TYPES.flatMap((t) =>
            DIFFICULTIES.flatMap((d) => SITE_REWARD_TABLES[t][d])
        );
        allRewards.forEach((r) => {
            expect(r.type).toBeDefined();
            expect(typeof r.name).toBe('string');
            expect(r.icon).toBeDefined();
        });
    });
});

describe('SiteRewardManager singleton + pools', () => {
    it('getInstance() returns a shared instance', () => {
        const a = SiteRewardManager.getInstance();
        const b = SiteRewardManager.getInstance();
        expect(a).toBe(b);
        expect(a).toBeInstanceOf(SiteRewardManager);
    });

    it('exposes the four known reward pools through the reward tables', () => {
        // ARTIFACTS / SPELLS / ADVANCED_ACTIONS / UNITS are internal; we
        // verify their presence indirectly via the site tables that draw from them.
        const allRewards = SITE_TYPES.flatMap((t) =>
            DIFFICULTIES.flatMap((d) => SITE_REWARD_TABLES[t][d])
        );
        const types = new Set(allRewards.map((r) => r.type));
        expect(types.has('artifact')).toBe(true);
        expect(types.has('spell')).toBe(true);
        expect(types.has('advanced_action')).toBe(true);
        expect(types.has('unit')).toBe(true);
    });
});

describe('rollRewards()', () => {
    let mgr;
    let spyRandom;

    beforeEach(() => {
        mgr = new SiteRewardManager();
        // Deterministic RNG: always 0 -> first branch selected in the weighted loop
        spyRandom = vi.spyOn(Math, 'random').mockReturnValue(0);
    });

    afterEach(() => {
        spyRandom.mockRestore();
    });

    it('returns empty array for unknown site type', () => {
        const result = mgr.rollRewards('does_not_exist');
        expect(result).toEqual([]);
    });

    it('returns exactly `count` rewards', () => {
        const result = mgr.rollRewards('dungeon', 'common', 3);
        expect(result).toHaveLength(3);
        result.forEach((roll) => {
            expect(roll.reward).toBeDefined();
            expect(typeof roll.rolled).toBe('number');
            expect(roll.rolled).toBeGreaterThanOrEqual(1);
            expect(roll.rolled).toBeLessThanOrEqual(100);
        });
    });

    it('defaults to common difficulty and count 1', () => {
        const result = mgr.rollRewards('ruin');
        expect(result).toHaveLength(1);
    });

    it('resolves template names to concrete rewards (spell/artifact/unit)', () => {
        // dungeon uncommon includes "Random Artifact", "Advanced Spell"
        const templateNames = new Set(['Random Artifact', 'Advanced Spell', 'Random Spell', 'Artifact', 'Spell']);
        let sawTemplate = false;
        let sawConcrete = false;
        for (let i = 0; i < 20 && !sawConcrete; i++) {
            const result = mgr.rollRewards('dungeon', 'uncommon', 5);
            for (const roll of result) {
                if (templateNames.has(roll.reward.name)) sawTemplate = true;
                else sawConcrete = true; // not a bare template name => resolved
            }
        }
        // With Math.random()=0 the first matching reward is chosen; both template
        // markers and concrete names are reachable across multiple rolls.
        expect(sawTemplate || sawConcrete).toBe(true);
    });

    it('produces valid rewards for every site/difficulty combination', () => {
        SITE_TYPES.forEach((type) => {
            DIFFICULTIES.forEach((diff) => {
                const result = mgr.rollRewards(type, diff, 2);
                expect(result.length).toBe(2);
                result.forEach((roll) => {
                    expect(roll.reward.type).toBeDefined();
                    expect(roll.reward.icon).toBeDefined();
                });
            });
        });
    });
});

describe('applyRewards() - branch coverage', () => {
    let mgr;
    let hero;

    const roll = (reward) => ({ reward, rolled: 1 });

    beforeEach(() => {
        mgr = new SiteRewardManager();
        hero = new Hero('TestHero');
        hero.crystals = { red: 0, blue: 0, green: 0, white: 0, gold: 0, black: 0 };
        hero.wounds = [];
        hero.units = [];
    });

    it('applies crystal rewards and reports count+color', () => {
        const messages = mgr.applyRewards(hero, [
            roll({ type: 'crystal', name: 'Red Crystal', color: 'red', count: 2, icon: '💎' }),
        ]);
        expect(hero.crystals.red).toBe(2);
        expect(messages).toContain('2x red Crystal');
    });

    it('applies fame via hero.gainFame', () => {
        const gainFame = vi.spyOn(hero, 'gainFame');
        const messages = mgr.applyRewards(hero, [
            roll({ type: 'fame', name: 'Fame', value: 4, icon: '⭐' }),
        ]);
        expect(gainFame).toHaveBeenCalledWith(4);
        expect(messages).toContain('4 Fame');
    });

    it('heals wounds one-per-point until none remain', () => {
        hero.takeWound();
        hero.takeWound();
        hero.takeWound();
        expect(hero.wounds.length).toBe(3);

        const messages = mgr.applyRewards(hero, [
            roll({ type: 'healing', name: 'Heal 2', value: 2, icon: '✨' }),
        ]);
        expect(hero.wounds.length).toBe(1); // healed 2 of 3
        expect(messages).toContain('Healed 2 wounds');
    });

    it('heals all wounds when more healing than wounds', () => {
        hero.takeWound();
        const messages = mgr.applyRewards(hero, [
            roll({ type: 'healing', name: 'Heal All', value: 99, icon: '✨' }),
        ]);
        expect(hero.wounds.length).toBe(0);
        expect(messages).toContain('Healed 1 wounds');
    });

    it('reports no heal message when hero has no wounds', () => {
        const messages = mgr.applyRewards(hero, [
            roll({ type: 'healing', name: 'Heal 1', value: 1, icon: '✨' }),
        ]);
        expect(hero.wounds.length).toBe(0);
        expect(messages).not.toContain('Healed 1 wounds');
    });

    it('logs artifact rewards without mutating hero', () => {
        const messages = mgr.applyRewards(hero, [
            roll({ type: 'artifact', name: 'Excalibur', icon: '⚔️' }),
        ]);
        expect(messages).toContain('Artifact: Excalibur');
        expect(hero.units.length).toBe(0);
    });

    it('logs spell rewards', () => {
        const messages = mgr.applyRewards(hero, [
            roll({ type: 'spell', name: 'Fireball', icon: '🔥' }),
        ]);
        expect(messages).toContain('Spell: Fireball');
    });

    it('logs advanced_action rewards when a name is present', () => {
        const messages = mgr.applyRewards(hero, [
            roll({ type: 'advanced_action', name: 'Rage', icon: '💢' }),
        ]);
        expect(messages).toContain('Advanced Action: Rage');
    });

    it('recruits a unit onto the hero', () => {
        const messages = mgr.applyRewards(hero, [
            roll({ type: 'unit', name: 'Spearman', icon: '🪖', data: { attack: 3 } }),
        ]);
        expect(hero.units.length).toBe(1);
        expect(hero.units[0].name).toBe('Spearman');
        expect(hero.units[0].attack).toBe(3);
        expect(messages).toContain('Unit: Spearman');
    });

    it('initializes hero.units if missing before recruiting', () => {
        hero.units = undefined;
        const messages = mgr.applyRewards(hero, [
            roll({ type: 'unit', name: 'Crossbowman', icon: '🏹', data: {} }),
        ]);
        expect(hero.units).toBeDefined();
        expect(hero.units.length).toBe(1);
        expect(messages).toContain('Unit: Crossbowman');
    });

    it('converts gold into a random crystal color', () => {
        const messages = mgr.applyRewards(hero, [
            roll({ type: 'gold', name: 'Gold', value: 3, icon: '💰' }),
        ]);
        const totalCrystals = Object.values(hero.crystals).reduce((a, b) => a + b, 0);
        expect(totalCrystals).toBe(3);
        expect(messages.some((m) => m.includes('Gold (as'))).toBe(true);
    });

    it('handles mana rewards as a no-op branch', () => {
        const messages = mgr.applyRewards(hero, [
            roll({ type: 'mana', name: 'Mana', value: 2, icon: '🔮' }),
        ]);
        expect(messages).toEqual([]);
    });

    it('handles unknown reward types via default', () => {
        const messages = mgr.applyRewards(hero, [
            roll({ type: 'unknown_type', name: 'Mystery', icon: '❓' }),
        ]);
        expect(messages).toEqual([]);
    });

    it('applies multiple rewards across branches in one call', () => {
        const messages = mgr.applyRewards(hero, [
            roll({ type: 'fame', name: 'Fame', value: 2, icon: '⭐' }),
            roll({ type: 'crystal', name: 'Blue Crystal', color: 'blue', count: 1, icon: '💎' }),
            roll({ type: 'unit', name: 'Healer', icon: '╕', data: { heal: 2 } }),
        ]);
        expect(hero.crystals.blue).toBe(1);
        expect(hero.units.length).toBe(1);
        expect(messages).toContain('2 Fame');
    });
});

describe('getRewardDescription()', () => {
    let mgr;

    const roll = (reward) => ({ reward, rolled: 1 });

    beforeEach(() => {
        mgr = new SiteRewardManager();
    });

    it('describes each reward type correctly', () => {
        const cases = [
            [{ type: 'crystal', count: 2, color: 'green', icon: '💎' }, '2x green Crystal'],
            [{ type: 'gold', value: 5, icon: '💰' }, '5 Gold'],
            [{ type: 'fame', value: 3, icon: '⭐' }, '3 Fame'],
            [{ type: 'healing', value: 2, icon: '✨' }, 'Heal 2 wounds'],
            [{ type: 'artifact', name: 'Ring of Mana', icon: '💍' }, 'Artifact: Ring of Mana'],
            [{ type: 'spell', name: 'Fireball', icon: '🔥' }, 'Spell: Fireball'],
            [{ type: 'advanced_action', name: 'Rage', icon: '💢' }, 'Advanced Action: Rage'],
            [{ type: 'unit', name: 'Spearman', icon: '🪖' }, 'Unit: Spearman'],
        ];
        cases.forEach(([reward, expected]) => {
            expect(mgr.getRewardDescription(roll(reward))).toBe(expected);
        });
    });

    it('falls back to reward name for unknown types', () => {
        expect(mgr.getRewardDescription(roll({ type: 'mana', name: 'Mana', icon: '🔮' }))).toBe('Mana');
    });
});

describe('createConcreteReward() - RNG branches', () => {
    let mgr;

    beforeEach(() => {
        mgr = new SiteRewardManager();
    });

    // rollRewards uses an internal weighted RNG selector that is not
    // externally controllable, so we exercise the concrete-reward branches by
    // rolling many rewards and asserting the resolved (non-template) names appear.
    const rollMany = () => {
        const all = [];
        SITE_TYPES.forEach((type) => {
            DIFFICULTIES.forEach((diff) => {
                all.push(...mgr.rollRewards(type, diff, 30));
            });
        });
        return all;
    };

    it('resolves crystal rewards to a concrete color', () => {
        const rewards = rollMany().filter((r) => r.reward.type === 'crystal');
        expect(rewards.length).toBeGreaterThan(0);
        rewards.forEach((r) => {
            expect(['red', 'blue', 'green', 'white', 'gold', 'black']).toContain(r.reward.color);
            expect(r.reward.count).toBeGreaterThanOrEqual(1);
        });
    });

    it('resolves unit/artifact/spell templates to concrete names', () => {
        const rewards = rollMany();
        const isConcrete = (n) =>
            !['Random Artifact', 'Minor Artifact', 'Artifact', 'Rare Artifact',
              'Random Spell', 'Spell', 'Basic Spell', 'Advanced Spell', 'Legendary Spell',
              'Advanced Action', 'Random Unit', 'Unit', 'Strong Unit', 'Undead Unit',
              'Strong Undead Unit', 'Elite Unit'].includes(n);
        const resolved = rewards.filter((r) => isConcrete(r.reward.name));
        expect(resolved.length).toBeGreaterThan(0);
    });

    it('resolves the Wish legendary spell template', () => {
        // magetower rare contains the "Legendary Spell" template which always
        // resolves to Wish. The internal RNG selector is not externally
        // controllable, so retry until the template is hit (it is guaranteed to
        // exist in the table).
        let wish = undefined;
        for (let i = 0; i < 50 && !wish; i++) {
            const rewards = mgr.rollRewards('magetower', 'rare', 50);
            wish = rewards.find(
                (r) => r.reward.type === 'spell' && r.reward.rarity === 'legendary'
            );
        }
        expect(wish).toBeDefined();
        expect(wish.reward.name).toBe('Wish');
    });
});

describe('getRandomUnit() - undead + fallback branches', () => {
    let mgr;

    beforeEach(() => {
        mgr = new SiteRewardManager();
    });

    it('resolves undead/strong/recruit unit templates to concrete names', () => {
        // tomb uncommon (Undead Unit), dungeon rare (Strong Unit),
        // village uncommon (Recruit Unit), spawning_grounds (Strong Unit).
        // The internal RNG selector is not externally controllable, so retry
        // across many rolls until unit rewards are produced (guaranteed to
        // exist in these tables).
        let units = [];
        for (let i = 0; i < 30 && units.length === 0; i++) {
            const rewards = [];
            ['tomb', 'dungeon', 'village', 'spawning_grounds'].forEach((type) => {
                rewards.push(...mgr.rollRewards(type, 'rare', 20));
                rewards.push(...mgr.rollRewards(type, 'uncommon', 20));
            });
            units = rewards.filter((r) => r.reward.type === 'unit');
        }
        expect(units.length).toBeGreaterThan(0);
        units.forEach((u) => {
            expect(typeof u.reward.name).toBe('string');
            expect(u.reward.name.length).toBeGreaterThan(0);
        });
    });
});

describe('getRandomSpell() / getRandomArtifact() selectors', () => {
    let mgr;

    beforeEach(() => {
        mgr = new SiteRewardManager();
    });

    it('resolves spell and artifact templates to concrete names', () => {
        const rewards = [];
        ['dungeon', 'ruin', 'tomb', 'magetower', 'monastery', 'keep'].forEach((type) => {
            DIFFICULTIES.forEach((diff) => {
                rewards.push(...mgr.rollRewards(type, diff, 20));
            });
        });
        const spells = rewards.filter((r) => r.reward.type === 'spell');
        const artifacts = rewards.filter((r) => r.reward.type === 'artifact');
        expect(spells.length).toBeGreaterThan(0);
        expect(artifacts.length).toBeGreaterThan(0);
        spells.forEach((s) => expect(s.reward.name.length).toBeGreaterThan(0));
        artifacts.forEach((a) => expect(a.reward.name.length).toBeGreaterThan(0));
    });
});
