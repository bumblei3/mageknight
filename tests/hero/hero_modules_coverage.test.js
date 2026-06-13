import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HeroInventory } from '../../js/hero/HeroInventory.js';
import { HeroSkills } from '../../js/hero/HeroSkills.js';
import { MANA_COLORS } from '../../js/mana.js';

// Mock dependencies
vi.mock('../../js/particles.js');
vi.mock('../../js/particles/WeatherSystem.js');

describe('HeroInventory - Coverage Boost', () => {
    let inventory;

    beforeEach(() => {
        inventory = new HeroInventory();
    });

    describe('Crystal Management', () => {
        it('should initialize with zero crystals', () => {
            const crystals = inventory.getCrystals();
            expect(crystals.red).toBe(0);
            expect(crystals.blue).toBe(0);
            expect(crystals.white).toBe(0);
            expect(crystals.green).toBe(0);
        });

        it('should add crystal when under max (3)', () => {
            expect(inventory.addCrystal('red')).toBe(true);
            expect(inventory.getCrystals().red).toBe(1);
        });

        it('should reject adding crystal when at max (3)', () => {
            inventory.addCrystal('red');
            inventory.addCrystal('red');
            inventory.addCrystal('red');
            expect(inventory.addCrystal('red')).toBe(false);
            expect(inventory.getCrystals().red).toBe(3);
        });

        it('should use crystal when available', () => {
            inventory.addCrystal('blue');
            expect(inventory.useCrystal('blue')).toBe(true);
            expect(inventory.getCrystals().blue).toBe(0);
        });

        it('should fail to use crystal when none available', () => {
            expect(inventory.useCrystal('white')).toBe(false);
        });

        it('should return copy of crystals', () => {
            inventory.addCrystal('red');
            const crystals = inventory.getCrystals();
            crystals.red = 99;
            expect(inventory.getCrystals().red).toBe(1);
        });
    });

    describe('Mana Management', () => {
        it('should take mana from source', () => {
            expect(inventory.takeManaFromSource('red')).toBe(true);
            expect(inventory.tempMana).toContain('red');
        });

        it('should reject invalid mana color', () => {
            expect(inventory.takeManaFromSource('invalid')).toBe(false);
        });

        it('should check hasMana correctly', () => {
            inventory.tempMana = ['red', 'blue'];
            expect(inventory.hasMana('red')).toBe(true);
            expect(inventory.hasMana('green')).toBe(false);
        });

        it('should handle gold mana as wildcard during day', () => {
            inventory.tempMana = ['gold'];
            expect(inventory.hasMana('red', false)).toBe(true); // day
            expect(inventory.hasMana('red', true)).toBe(false); // night
        });

        it('should canAffordMana with matching color', () => {
            inventory.tempMana = ['red'];
            const card = { color: 'red', manaCost: 1 };
            expect(inventory.canAffordMana(card)).toBe(true);
        });

        it('should canAffordMana with gold during day', () => {
            inventory.tempMana = ['gold'];
            const card = { color: 'blue', manaCost: 1 };
            expect(inventory.canAffordMana(card, false)).toBe(true);
        });

        it('should spend mana correctly', () => {
            inventory.tempMana = ['red', 'blue'];
            expect(inventory.spendMana('red')).toBe(true);
            expect(inventory.tempMana).toEqual(['blue']);
        });

        it('should spend gold as wildcard during day', () => {
            inventory.tempMana = ['gold'];
            expect(inventory.spendMana('red', false)).toBe(true);
            expect(inventory.tempMana).toEqual([]);
        });

        it('should clear temp mana', () => {
            inventory.tempMana = ['red', 'blue'];
            inventory.clearTempMana();
            expect(inventory.tempMana).toEqual([]);
        });

        it('should get mana inventory count', () => {
            inventory.tempMana = ['red', 'red', 'blue'];
            const inv = inventory.getManaInventory();
            expect(inv.red).toBe(2);
            expect(inv.blue).toBe(1);
        });
    });

    describe('Artifacts', () => {
        it('should award random artifact to discard pile', () => {
            const discardPile = [];
            const artifact = inventory.awardRandomArtifact(discardPile);
            expect(artifact).toBeDefined();
            expect(discardPile.length).toBe(1);
        });
    });

    describe('State Persistence', () => {
        it('should get state', () => {
            inventory.addCrystal('red');
            inventory.tempMana = ['blue'];
            const state = inventory.getState();
            expect(state.crystals.red).toBe(1);
            expect(state.tempMana).toContain('blue');
        });

        it('should load state', () => {
            const state = { crystals: { red: 2, blue: 1, white: 0, green: 0 }, tempMana: ['red'] };
            inventory.loadState(state);
            expect(inventory.getCrystals().red).toBe(2);
            expect(inventory.tempMana).toContain('red');
        });

        it('should reset inventory', () => {
            inventory.addCrystal('red');
            inventory.tempMana = ['blue'];
            inventory.reset();
            expect(inventory.getCrystals().red).toBe(0);
            expect(inventory.tempMana).toEqual([]);
        });
    });
});

describe('HeroSkills - Coverage Boost', () => {
    let hero;
    let skills;

    beforeEach(() => {
        hero = { armor: 0 };
        skills = new HeroSkills(hero);
    });

    describe('Skill Management', () => {
        it('should initialize empty', () => {
            expect(skills.skills).toEqual([]);
            expect(skills.usedSkills.size).toBe(0);
        });

        it('should add skill', () => {
            const skill = { id: 'test_skill', name: 'Test Skill', description: 'Desc', icon: '⚔️', type: 'passive' };
            skills.addSkill(skill);
            expect(skills.skills.length).toBe(1);
            expect(skills.hasSkill('test_skill')).toBe(true);
        });

        it('should apply dragon_scales passive effect', () => {
            const skill = { id: 'dragon_scales', name: 'Dragon Scales', description: 'Desc', icon: '🐉', type: 'passive' };
            skills.addSkill(skill);
            expect(hero.armor).toBe(1);
        });

        it('should get skills copy', () => {
            skills.addSkill({ id: 'skill1', name: 'Skill 1', description: '', icon: '', type: 'passive' });
            const mySkills = skills.getSkills();
            mySkills.push({ id: 'skill2', name: 'Skill 2', description: '', icon: '', type: 'passive' });
            expect(skills.skills.length).toBe(1);
        });
    });

    describe('Active Skills', () => {
        it('should check if can use active skill', () => {
            skills.addSkill({ id: 'active_skill', name: 'Active', description: '', icon: '', type: 'active' });
            expect(skills.canUseSkill('active_skill')).toBe(true);
        });

        it('should not allow using passive skill as active', () => {
            skills.addSkill({ id: 'passive_skill', name: 'Passive', description: '', icon: '', type: 'passive' });
            expect(skills.canUseSkill('passive_skill')).toBe(false);
        });

        it('should not allow reusing skill', () => {
            skills.addSkill({ id: 'active_skill', name: 'Active', description: '', icon: '', type: 'active' });
            skills.useSkill('active_skill');
            expect(skills.canUseSkill('active_skill')).toBe(false);
        });

        it('should use skill and mark as used', () => {
            skills.addSkill({ id: 'active_skill', name: 'Active', description: '', icon: '', type: 'active' });
            expect(skills.useSkill('active_skill')).toBe(true);
            expect(skills.usedSkills.has('active_skill')).toBe(true);
        });

        it('should fail to use non-existent skill', () => {
            expect(skills.useSkill('nonexistent')).toBe(false);
        });

        it('should reset used skills', () => {
            skills.addSkill({ id: 'active_skill', name: 'Active', description: '', icon: '', type: 'active' });
            skills.useSkill('active_skill');
            skills.resetUsedSkills();
            expect(skills.usedSkills.size).toBe(0);
            expect(skills.canUseSkill('active_skill')).toBe(true);
        });
    });

    describe('State Persistence', () => {
        it('should get state', () => {
            skills.addSkill({ id: 'skill1', name: 'Skill 1', description: '', icon: '', type: 'passive' });
            skills.useSkill('active_skill'); // Will fail but we test state
            skills.addSkill({ id: 'active_skill', name: 'Active', description: '', icon: '', type: 'active' });
            skills.useSkill('active_skill');
            const state = skills.getState();
            expect(state.skills.length).toBe(2);
            expect(state.usedSkills).toContain('active_skill');
        });

        it('should load state', () => {
            const state = {
                skills: [{ id: 'loaded', name: 'Loaded', description: '', icon: '', type: 'passive' }],
                usedSkills: ['used_skill']
            };
            skills.loadState(state);
            expect(skills.skills.length).toBe(1);
            expect(skills.hasSkill('loaded')).toBe(true);
            expect(skills.usedSkills.has('used_skill')).toBe(true);
        });

        it('should reset skills', () => {
            skills.addSkill({ id: 'skill1', name: 'Skill 1', description: '', icon: '', type: 'passive' });
            skills.addSkill({ id: 'active_skill', name: 'Active', description: '', icon: '', type: 'active' });
            skills.useSkill('active_skill');
            skills.reset();
            expect(skills.skills).toEqual([]);
            expect(skills.usedSkills.size).toBe(0);
        });
    });
});