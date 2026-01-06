import { ACTION_TYPES, COMBAT_PHASES } from '../constants.js';
import { t } from '../i18n/index.js';

export class CombatUnitManager {
    constructor() {
        this.unitAttackPoints = 0;
        this.unitBlockPoints = 0;
        this.unitRangedPoints = 0;
        this.unitSiegePoints = 0;
        this.activatedUnits = new Set();
    }

    reset() {
        this.unitAttackPoints = 0;
        this.unitBlockPoints = 0;
        this.unitRangedPoints = 0;
        this.unitSiegePoints = 0;
        this.activatedUnits.clear();
    }

    activateUnit(unit, currentPhase) {
        if (!unit.isReady()) {
            return { success: false, message: t('combat.unitNotReady') };
        }

        const unitId = unit.id || unit.getName();
        if (this.activatedUnits.has(unitId)) {
            return { success: false, message: t('combat.unitAlreadyActivated') };
        }

        // Activate the unit
        unit.activate();
        this.activatedUnits.add(unitId);

        // Apply unit abilities based on phase
        const abilities = unit.getAbilities();
        let applied = [];

        abilities.forEach(ability => {
            if (currentPhase === COMBAT_PHASES.BLOCK && ability.type === ACTION_TYPES.BLOCK) {
                this.unitBlockPoints += ability.value;
                applied.push(`+${ability.value} Block`);
            } else if (currentPhase === COMBAT_PHASES.ATTACK) {
                if (ability.type === ACTION_TYPES.ATTACK) {
                    this.unitAttackPoints += ability.value;
                    applied.push(`+${ability.value} Angriff`);
                } else if (ability.type === ACTION_TYPES.RANGED) {
                    this.unitAttackPoints += ability.value;
                    applied.push(`+${ability.value} Angriff (aus Fernkampf)`);
                } else if (ability.type === ACTION_TYPES.SIEGE) {
                    this.unitAttackPoints += ability.value;
                    applied.push(`+${ability.value} Angriff (aus Belagerung)`);
                }
            } else if (currentPhase === COMBAT_PHASES.RANGED) {
                if (ability.type === ACTION_TYPES.RANGED) {
                    this.unitRangedPoints += ability.value;
                    applied.push(`+${ability.value} Fernkampf`);
                } else if (ability.type === ACTION_TYPES.SIEGE) {
                    this.unitSiegePoints += ability.value;
                    applied.push(`+${ability.value} Belagerung`);
                }
            }
        });

        return {
            success: true,
            unit: unit,
            applied: applied.join(', '),
            message: t('combat.unitActivated', { unit: unit.getName(), applied: applied.join(', ') })
        };
    }

    getState() {
        return {
            unitAttackPoints: this.unitAttackPoints,
            unitBlockPoints: this.unitBlockPoints,
            unitRangedPoints: this.unitRangedPoints,
            unitSiegePoints: this.unitSiegePoints,
            activatedUnits: Array.from(this.activatedUnits)
        };
    }

    loadState(state) {
        if (!state) return;
        this.unitAttackPoints = state.unitAttackPoints || 0;
        this.unitBlockPoints = state.unitBlockPoints || 0;
        this.unitRangedPoints = state.unitRangedPoints || 0;
        this.unitSiegePoints = state.unitSiegePoints || 0;
        this.activatedUnits = new Set(state.activatedUnits || []);
    }
}
