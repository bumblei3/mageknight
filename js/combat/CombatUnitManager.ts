import { ACTION_TYPES, COMBAT_PHASES } from '../constants';
import { t } from '../i18n/index';

export class CombatUnitManager {
    public unitAttackPoints: number = 0;
    public unitBlockPoints: number = 0;
    public unitRangedPoints: number = 0;
    public unitSiegePoints: number = 0;
    private activatedUnits: Set<string> = new Set();

    constructor() {
        this.reset();
    }

    public reset(): void {
        this.unitAttackPoints = 0;
        this.unitBlockPoints = 0;
        this.unitRangedPoints = 0;
        this.unitSiegePoints = 0;
        this.activatedUnits.clear();
    }

    public activateUnit(unit: any, currentPhase: string): any {
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
        let applied: string[] = [];

        abilities.forEach((ability: any) => {
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

    public getState(): any {
        return {
            unitAttackPoints: this.unitAttackPoints,
            unitBlockPoints: this.unitBlockPoints,
            unitRangedPoints: this.unitRangedPoints,
            unitSiegePoints: this.unitSiegePoints,
            activatedUnits: Array.from(this.activatedUnits)
        };
    }

    public loadState(state: any): void {
        if (!state) return;
        this.unitAttackPoints = state.unitAttackPoints || 0;
        this.unitBlockPoints = state.unitBlockPoints || 0;
        this.unitRangedPoints = state.unitRangedPoints || 0;
        this.unitSiegePoints = state.unitSiegePoints || 0;
        this.activatedUnits = new Set(state.activatedUnits || []);
    }
}
