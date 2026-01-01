import { describe, it, expect } from './testRunner.js';
import { Unit, UNIT_TYPES, UNIT_INFO, getUnitsForLocation, createUnit } from '../js/unit.js';

describe('Unit System', () => {
    it('should create a unit with correct properties', () => {
        const unit = new Unit(UNIT_TYPES.PEASANTS);

        expect(unit.getName()).toBe('Bauern');
        expect(unit.getIcon()).toBe('👨‍🌾');
        expect(unit.getCost()).toBe(3);
        expect(unit.getArmor()).toBe(3);
        expect(unit.isReady()).toBe(true);
    });

    it('should have abilities', () => {
        const unit = new Unit(UNIT_TYPES.PEASANTS);
        const abilities = unit.getAbilities();

        expect(abilities).toHaveLength(2);
        expect(abilities[0].type).toBe('influence');
        expect(abilities[0].value).toBe(2);
    });

    it('should activate and become not ready', () => {
        const unit = new Unit(UNIT_TYPES.SWORDSMEN);

        const activated = unit.activate();

        expect(activated).toBe(true);
        expect(unit.isReady()).toBe(false);
    });

    it('should not activate if wounded', () => {
        const unit = new Unit(UNIT_TYPES.GUARDS);
        unit.takeWound();

        const activated = unit.activate();

        expect(activated).toBe(false);
        expect(unit.isWounded()).toBe(true);
    });

    it('should refresh to ready state', () => {
        const unit = new Unit(UNIT_TYPES.THUGS);
        unit.activate();

        unit.refresh();

        expect(unit.isReady()).toBe(true);
    });

    it('should heal wounds', () => {
        const unit = new Unit(UNIT_TYPES.CROSSBOWMEN);
        unit.takeWound();

        unit.heal();

        expect(unit.isWounded()).toBe(false);
        expect(unit.wounds).toBe(0);
    });

    it('should track wounds correctly', () => {
        const unit = new Unit(UNIT_TYPES.MAGES);

        unit.takeWound();
        expect(unit.wounds).toBe(1);

        unit.takeWound();
        expect(unit.wounds).toBe(2);
    });

    it('should return units for specific location', () => {
        const villageUnits = getUnitsForLocation('village');

        expect(villageUnits.length).toBeGreaterThan(0);
        expect(villageUnits.some(u => u.name === 'Bauern')).toBe(true);
    });

    it('should have different unit levels', () => {
        const peasants = new Unit(UNIT_TYPES.PEASANTS);
        const swordsmen = new Unit(UNIT_TYPES.SWORDSMEN);
        const golems = new Unit(UNIT_TYPES.GOLEMS);

        expect(peasants.info.level).toBe(1);
        expect(swordsmen.info.level).toBe(2);
        expect(golems.info.level).toBe(3);
    });

    it('should have ranged attack abilities', () => {
        const crossbowmen = new Unit(UNIT_TYPES.CROSSBOWMEN);
        const abilities = crossbowmen.getAbilities();

        const rangedAbility = abilities.find(a => a.type === 'ranged');
        expect(rangedAbility).toBeDefined();
        expect(rangedAbility.value).toBe(3);
    });

    it('should have elemental abilities', () => {
        const mages = new Unit(UNIT_TYPES.MAGES);
        const abilities = mages.getAbilities();

        const fireAbility = abilities.find(a => a.element === 'fire');
        const iceAbility = abilities.find(a => a.element === 'ice');

        expect(fireAbility).toBeDefined();
        expect(iceAbility).toBeDefined();
    });

    it('should have proper cost scaling with level', () => {
        const peasants = new Unit(UNIT_TYPES.PEASANTS);
        const swordsmen = new Unit(UNIT_TYPES.SWORDSMEN);
        const golems = new Unit(UNIT_TYPES.GOLEMS);

        expect(peasants.getCost()).toBeLessThan(swordsmen.getCost());
        expect(swordsmen.getCost()).toBeLessThan(golems.getCost());
    });

    it('should handle unknown unit type in createUnit', () => {
        const unit = createUnit('unknown');
        expect(unit).toBe(null);
    });
});
