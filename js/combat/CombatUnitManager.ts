import { ACTION_TYPES, COMBAT_PHASES, ATTACK_ELEMENTS } from '../constants';
import { t } from '../i18n/index';

export interface ElementalValue {
    physical: number;
    fire: number;
    ice: number;
    cold_fire: number;
}

export class CombatUnitManager {
    public unitAttackPoints: ElementalValue = { physical: 0, fire: 0, ice: 0, cold_fire: 0 };
    public unitBlockPoints: ElementalValue = { physical: 0, fire: 0, ice: 0, cold_fire: 0 };
    public unitRangedPoints: ElementalValue = { physical: 0, fire: 0, ice: 0, cold_fire: 0 };
    public unitSiegePoints: number = 0;
    private activatedUnits: Set<string> = new Set();

    constructor() {
        this.reset();
    }

    public reset(): void {
        this.unitAttackPoints = { physical: 0, fire: 0, ice: 0, cold_fire: 0 };
        this.unitBlockPoints = { physical: 0, fire: 0, ice: 0, cold_fire: 0 };
        this.unitRangedPoints = { physical: 0, fire: 0, ice: 0, cold_fire: 0 };
        this.unitSiegePoints = 0;
        this.activatedUnits.clear();
    }

    get totalBlockPoints(): number {
        return this.unitBlockPoints.physical + this.unitBlockPoints.fire + this.unitBlockPoints.ice + this.unitBlockPoints.cold_fire;
    }

    get totalAttackPoints(): number {
        return this.unitAttackPoints.physical + this.unitAttackPoints.fire + this.unitAttackPoints.ice + this.unitAttackPoints.cold_fire;
    }

    get totalRangedPoints(): number {
        return this.unitRangedPoints.physical + this.unitRangedPoints.fire + this.unitRangedPoints.ice + this.unitRangedPoints.cold_fire;
    }

    get totalSiegePoints(): number {
        return this.unitSiegePoints;
    }

    public activateUnit(unit: any, currentPhase: string): any {
        if (!unit.isReady()) {
            return { success: false, message: t('combat.unitNotReady') };
        }

        const unitId = unit.id || unit.getName();
        if (this.activatedUnits.has(unitId)) {
            return { success: false, message: t('combat.unitAlreadyActivated') };
        }

        unit.activate();
        this.activatedUnits.add(unitId);

        const abilities = unit.getAbilities();
        let applied: string[] = [];

        abilities.forEach((ability: any) => {
            const element = ability.element || ATTACK_ELEMENTS.PHYSICAL;

            if (currentPhase === COMBAT_PHASES.BLOCK && ability.type === ACTION_TYPES.BLOCK) {
                this.unitBlockPoints[element as keyof ElementalValue] = (this.unitBlockPoints[element as keyof ElementalValue] || 0) + ability.value;
                const elemLabel = element === ATTACK_ELEMENTS.PHYSICAL ? '' : ` (${element})`;
                applied.push(`+${ability.value} Block${elemLabel}`);
            } else if (currentPhase === COMBAT_PHASES.ATTACK) {
                if (ability.type === ACTION_TYPES.ATTACK) {
                    this.unitAttackPoints[element as keyof ElementalValue] = (this.unitAttackPoints[element as keyof ElementalValue] || 0) + ability.value;
                    const elemLabel = element === ATTACK_ELEMENTS.PHYSICAL ? '' : ` (${element})`;
                    applied.push(`+${ability.value} Angriff${elemLabel}`);
                } else if (ability.type === ACTION_TYPES.RANGED) {
                    this.unitAttackPoints[element as keyof ElementalValue] = (this.unitAttackPoints[element as keyof ElementalValue] || 0) + ability.value;
                    const elemLabel = element === ATTACK_ELEMENTS.PHYSICAL ? '' : ` (${element})`;
                    applied.push(`+${ability.value} Angriff${elemLabel} (aus Fernkampf)`);
                } else if (ability.type === ACTION_TYPES.SIEGE) {
                    this.unitAttackPoints[element as keyof ElementalValue] = (this.unitAttackPoints[element as keyof ElementalValue] || 0) + ability.value;
                    const elemLabel = element === ATTACK_ELEMENTS.PHYSICAL ? '' : ` (${element})`;
                    applied.push(`+${ability.value} Angriff${elemLabel} (aus Belagerung)`);
                }
            } else if (currentPhase === COMBAT_PHASES.RANGED) {
                if (ability.type === ACTION_TYPES.RANGED) {
                    this.unitRangedPoints[element as keyof ElementalValue] = (this.unitRangedPoints[element as keyof ElementalValue] || 0) + ability.value;
                    const elemLabel = element === ATTACK_ELEMENTS.PHYSICAL ? '' : ` (${element})`;
                    applied.push(`+${ability.value} Fernkampf${elemLabel}`);
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

    getBlockSources(): Array<{ value: number; element: string }> {
        const sources: Array<{ value: number; element: string }> = [];
        (Object.keys(this.unitBlockPoints) as Array<keyof ElementalValue>).forEach(element => {
            const value = this.unitBlockPoints[element];
            if (value > 0) {
                sources.push({ value, element });
            }
        });
        return sources;
    }

    getAttackSources(): Array<{ value: number; element: string }> {
        const sources: Array<{ value: number; element: string }> = [];
        (Object.keys(this.unitAttackPoints) as Array<keyof ElementalValue>).forEach(element => {
            const value = this.unitAttackPoints[element];
            if (value > 0) {
                sources.push({ value, element });
            }
        });
        return sources;
    }

    getRangedSources(): Array<{ value: number; element: string }> {
        const sources: Array<{ value: number; element: string }> = [];
        (Object.keys(this.unitRangedPoints) as Array<keyof ElementalValue>).forEach(element => {
            const value = this.unitRangedPoints[element];
            if (value > 0) {
                sources.push({ value, element });
            }
        });
        return sources;
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
        this.unitAttackPoints = state.unitAttackPoints || { physical: 0, fire: 0, ice: 0, cold_fire: 0 };
        this.unitBlockPoints = state.unitBlockPoints || { physical: 0, fire: 0, ice: 0, cold_fire: 0 };
        this.unitRangedPoints = state.unitRangedPoints || { physical: 0, fire: 0, ice: 0, cold_fire: 0 };
        this.unitSiegePoints = state.unitSiegePoints || 0;
        this.activatedUnits = new Set(state.activatedUnits || []);
    }
}
