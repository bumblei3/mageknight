import { StatusEffectManager } from './statusEffects';
import { COMBAT_PHASES } from './constants';
import { logger } from './logger';
import { t } from './i18n/index';
import { BlockingEngine } from './combat/BlockingEngine';
import { DamageSystem } from './combat/DamageSystem';
import { CombatCombos } from './combat/CombatCombos';
import { CombatPredictor } from './combat/CombatPredictor';
import { CombatUnitManager } from './combat/CombatUnitManager';
import { RangedPhase } from './combat/RangedPhase';
import { AttackPhase } from './combat/AttackPhase';
import { Hero } from './hero';
import { Enemy } from './enemy';
import { Card } from './card';

export const COMBAT_PHASE = COMBAT_PHASES;

export interface CombatState {
    phase: string;
    enemies: any[];
    defeatedEnemies: Enemy[];
    blockedEnemies: string[];
    totalDamage: number;
    woundsReceived: number;
    [key: string]: any;
}

export interface CombatStartResult {
    phase: string;
    enemies: Enemy[];
    message: string;
}

export interface PhaseResult {
    phase?: string;
    message?: string;
    totalDamage?: number;
    blockedEnemies?: string[];
    unblockedEnemies?: any[];
    woundsReceived?: number;
    paralyzeTriggered?: boolean;
    error?: string;
    nextPhase?: string;
    waitingForAssignment?: boolean;
    victory?: boolean;
    defeatedEnemies?: Enemy[];
    remainingEnemies?: Enemy[];
    fameGained?: number;
    poisonWounds?: number;
}

export interface BlockResult {
    success: boolean;
    blocked?: boolean;
    message?: string;
    error?: string;
    unitPointsConsumed?: number;
}

export interface DamageAssignmentResult {
    success: boolean;
    message: string;
    unitDestroyed?: boolean;
    error?: string;
}

export class Combat {
    hero: Hero;
    enemies: Enemy[];
    enemy: Enemy;
    phase: string;
    defeatedEnemies: Enemy[];
    blockedEnemies: Set<string>;
    unblockedEnemies: Enemy[] = [];
    totalDamage: number;
    woundsReceived: number;
    paralyzeTriggered: boolean = false;

    statusEffects: any;
    blockingEngine: any;
    damageSystem: any;
    unitManager: any;
    rangedPhaseController: any;
    attackPhaseController: any;

    summonedEnemies: Map<string, Enemy>;
    onComplete?: (result: PhaseResult) => void;

    constructor(hero: Hero, enemies: Enemy | Enemy[], onComplete?: (result: PhaseResult) => void) {
        this.hero = hero;
        this.enemies = Array.isArray(enemies) ? enemies : [enemies];
        this.onComplete = onComplete;
        this.enemy = this.enemies[0];
        this.phase = COMBAT_PHASES.NOT_IN_COMBAT;
        this.defeatedEnemies = [];
        this.blockedEnemies = new Set();
        this.totalDamage = 0;
        this.woundsReceived = 0;

        this.statusEffects = new StatusEffectManager();

        this.blockingEngine = new BlockingEngine();
        this.damageSystem = new DamageSystem();

        this.unitManager = new CombatUnitManager();
        this.rangedPhaseController = new RangedPhase(this);
        this.attackPhaseController = new AttackPhase(this);

        this.summonedEnemies = new Map();
    }

    // Backward compatible getters/setters
    get unitAttackPoints(): number { return this.unitManager.totalAttackPoints; }
    set unitAttackPoints(v: number) { 
        // For backward compat: add to physical attack points
        this.unitManager.unitAttackPoints.physical = v; 
    }

    get unitBlockPoints(): number { return this.unitManager.totalBlockPoints; }
    set unitBlockPoints(v: number) { 
        // For backward compat: add to physical block points
        this.unitManager.unitBlockPoints.physical = v; 
    }

    get unitRangedPoints(): number { return this.unitManager.totalRangedPoints; }
    set unitRangedPoints(v: number) { 
        // For backward compat: add to physical ranged points
        this.unitManager.unitRangedPoints.physical = v; 
    }

    get unitSiegePoints(): number { return this.unitManager.totalSiegePoints; }
    set unitSiegePoints(v: number) { 
        // For backward compat
        this.unitManager.unitSiegePoints = v; 
    }

    get activatedUnits(): any[] { return this.unitManager.activatedUnits; }
    set activatedUnits(v: any[]) { this.unitManager.activatedUnits = v; }

    start(): CombatStartResult {
        logger.info(`Combat started against ${this.enemies.length} enemies`);
        this.damageSystem.reset();
        this.unitManager.reset();
        this.phase = COMBAT_PHASES.RANGED;
        return {
            phase: this.phase,
            enemies: this.enemies,
            message: t('combat.message', { count: this.enemies.length }) + ' ' + t('ui.phases.ranged') + '.'
        };
    }

    rangedPhase(): any {
        return this.rangedPhaseController.update(this.enemies);
    }

    rangedAttackEnemy(enemy: Enemy, rangedValue: number, siegeValue: number, element = 'physical'): any {
        return this.rangedPhaseController.executeAttack(enemy, rangedValue, siegeValue, element);
    }

    endRangedPhase(): PhaseResult {
        if (this.phase !== COMBAT_PHASES.RANGED) {
            return { error: t('ui.phases.ranged') };
        }

        if (this.enemies.length === 0) {
            return this.endCombat();
        }

        this.handleSummoning();

        this.phase = COMBAT_PHASES.BLOCK;
        return {
            phase: this.phase,
            message: t('combat.blockStarted')
        };
    }

    handleSummoning(): void {
        this.rangedPhaseController.handleSummoning(this.enemies, this.defeatedEnemies);
    }

    blockPhase(): PhaseResult {
        if (this.phase !== COMBAT_PHASES.BLOCK) {
            return { error: t('ui.phases.block') };
        }

        this.totalDamage = 0;
        this.enemies.forEach(enemy => {
            if (!this.blockedEnemies.has(enemy.id)) {
                this.totalDamage += enemy.getEffectiveAttack();
            }
        });

        return {
            totalDamage: this.totalDamage,
            blockedEnemies: Array.from(this.blockedEnemies),
            message: t('combat.totalDamage', { amount: this.totalDamage })
        };
    }

    blockEnemy(enemy: Enemy, blockInput: any, movementPoints = 0): BlockResult {
        if (this.phase !== COMBAT_PHASES.BLOCK) {
            return { success: false, error: t('ui.phases.block') };
        }

        if (this.blockedEnemies.has(enemy.id)) {
            return { success: false, message: t('combat.alreadyBlocked') };
        }

        const unitBlockSources = this.unitManager.getBlockSources ? this.unitManager.getBlockSources() : [];

        const result = this.blockingEngine.calculateBlock(enemy, blockInput, unitBlockSources, movementPoints);

        if (result.success && result.blocked) {
            this.blockedEnemies.add(enemy.id);
            if (result.unitPointsConsumed > 0) {
                this.unitManager.unitBlockPoints = { physical: 0, fire: 0, ice: 0, cold_fire: 0 };
            }
        }

        return result;
    }

    endBlockPhase(): PhaseResult {
        if (this.phase !== COMBAT_PHASES.BLOCK) {
            return { error: t('ui.phases.block') };
        }

        this.phase = COMBAT_PHASES.DAMAGE;
        return this.damagePhase();
    }

    damagePhase(): PhaseResult {
        if (this.phase !== COMBAT_PHASES.DAMAGE) {
            return { error: t('ui.phases.combat') };
        }

        this.unblockedEnemies = this.enemies.filter(e => !this.blockedEnemies.has(e.id));

        if (this.unblockedEnemies.length === 0) {
            this.phase = COMBAT_PHASES.ATTACK;
            return {
                totalDamage: 0,
                woundsReceived: 0,
                unblockedEnemies: [],
                message: t('combat.damageSkipped'),
                nextPhase: COMBAT_PHASES.ATTACK
            };
        }

        this.totalDamage = this.unblockedEnemies.reduce((sum, e) => sum + e.getEffectiveAttack(), 0);

        return {
            totalDamage: this.totalDamage,
            unblockedEnemies: this.unblockedEnemies as any,
            message: t('combat.assignDamage'),
            nextPhase: COMBAT_PHASES.DAMAGE,
            waitingForAssignment: true
        };
    }

    resolveDamagePhase(): PhaseResult | undefined {
        if (this.phase !== COMBAT_PHASES.DAMAGE) return;

        const activeUnblocked = this.unblockedEnemies.filter(e => !(e as any).damageAssigned);

        const result = this.damageSystem.calculateDamage(this.hero, activeUnblocked);

        this.totalDamage = result.totalDamage;
        this.woundsReceived = result.woundsReceived;
        this.paralyzeTriggered = result.paralyzeTriggered;

        this.phase = COMBAT_PHASES.ATTACK;

        return {
            totalDamage: this.totalDamage,
            woundsReceived: this.woundsReceived,
            paralyzeTriggered: this.paralyzeTriggered,
            message: result.message,
            nextPhase: COMBAT_PHASES.ATTACK
        };
    }

    assignDamageToUnit(unit: any, enemyId: string | null = null): DamageAssignmentResult {
        if (this.phase !== COMBAT_PHASES.DAMAGE) {
            return { success: false, message: t('combat.phaseDamageOnly') };
        }

        let enemy: any = null;
        if (enemyId) {
            enemy = this.unblockedEnemies.find(e => e.id === enemyId);
        } else {
            enemy = this.unblockedEnemies.find(e => !(e as any).damageAssigned && !(e as any).assassin);
        }

        if (!enemy) {
            if (this.unblockedEnemies.some(e => (e as any).assassin && !(e as any).damageAssigned)) {
                return { success: false, message: t('combat.assassinateRestriction', { enemy: 'Assassin' }) };
            }
            return { success: false, message: t('combat.noEnemyToAssign') };
        }

        if (enemy.damageAssigned) {
            return { success: false, message: t('combat.alreadyAssigned') };
        }

        const result = this.damageSystem.assignDamageToUnit(unit, enemy);

        if (result.success) {
            enemy.damageAssigned = true;
            this.totalDamage -= enemy.getEffectiveAttack();
            return { success: true, message: t('combat.damageAssignedTo', { unit: unit.getName(), enemy: enemy.name }), unitDestroyed: result.unitDestroyed };
        } else {
            return result;
        }
    }

    handleParalyzeEffect(): number {
        if (!this.paralyzeTriggered) return 0;

        const discarded = this.hero.discardNonWoundCards(this.woundsReceived);
        this.paralyzeTriggered = false;
        return discarded;
    }

    attackPhase(): any {
        return this.attackPhaseController.update(this.enemies);
    }

    activateUnit(unit: any): any {
        return this.unitManager.activateUnit(unit, this.phase);
    }

    attackEnemies(attackValue: number, attackElement = 'physical', targetEnemies: Enemy[] | null = null): any {
        return this.attackPhaseController.executeAttack(attackValue, attackElement, targetEnemies);
    }

    detectCombo(playedCards: Card[]): any {
        return (CombatCombos as any).detectCombo(playedCards);
    }

    calculateCriticalHit(baseAttack: number, critChance = 0.15): number {
        return (CombatCombos as any).calculateCriticalHit(baseAttack, critChance);
    }

    applyComboBonus(baseValue: number, combo: any): number {
        return (CombatCombos as any).applyComboBonus(baseValue, combo);
    }

    applyEffectToHero(effectType: string, source: any = null): any {
        return this.statusEffects.applyToHero(this.hero, effectType, source);
    }

    applyEffectToEnemy(enemy: Enemy, effectType: string, source: any = null): any {
        return this.statusEffects.applyToEnemy(enemy, effectType, source);
    }

    getHeroEffects(): any {
        return this.statusEffects.getHeroEffects();
    }

    getEnemyEffects(enemy: Enemy): any {
        return this.statusEffects.getEnemyEffects(enemy);
    }

    processPhaseEffects(): any {
        const results: any = {
            heroDamage: 0,
            enemyDamage: [],
            messages: []
        };

        const heroResult = this.statusEffects.processHeroPhaseStart(this.hero);
        if (heroResult && heroResult.damage) {
            results.heroDamage = heroResult.damage;
            results.messages.push(t('combat.heroStatusDamage', { amount: heroResult.damage }));
        }

        const enemyResults = this.statusEffects.processEnemyPhaseStart(this.enemies);
        for (const result of enemyResults) {
            if (result.damage) {
                results.enemyDamage.push({ enemy: result.enemy, damage: result.damage });
                results.messages.push(t('combat.enemyStatusDamage', { enemy: result.enemy.name, amount: result.damage }));
            }
        }

        return results;
    }

    endCombat(): PhaseResult {
        const endResult = this.statusEffects.processCombatEnd(this.hero);
        if (endResult.wounds > 0) {
            for (let i = 0; i < endResult.wounds; i++) {
                this.hero.takeWound();
            }
            this.woundsReceived += endResult.wounds;
        }

        this.statusEffects.clear();
        this.phase = COMBAT_PHASES.COMPLETE;
        const allDefeated = this.enemies.length === 0;
        const result: PhaseResult = {
            victory: allDefeated,
            defeatedEnemies: this.defeatedEnemies,
            remainingEnemies: this.enemies,
            woundsReceived: this.woundsReceived,
            fameGained: this.defeatedEnemies.reduce((sum, e) => sum + e.fame, 0),
            poisonWounds: endResult.wounds,
            message: allDefeated ? t('game.victory') : t('combat.combatEnded')
        };

        if (this.onComplete) {
            this.onComplete(result);
        }

        return result;
    }

    getPredictedOutcome(currentAttack = 0, currentBlock = 0): any {
        return (CombatPredictor as any).getPredictedOutcome(this, currentAttack, currentBlock);
    }

    isComplete(): boolean {
        return this.phase === COMBAT_PHASES.COMPLETE;
    }

    getState(): CombatState {
        return {
            phase: this.phase,
            enemies: this.enemies.map(e => typeof e.getState === 'function' ? e.getState() : { ...e }),
            defeatedEnemies: this.defeatedEnemies,
            blockedEnemies: Array.from(this.blockedEnemies),
            totalDamage: this.totalDamage,
            woundsReceived: this.woundsReceived,
            ...this.unitManager.getState()
        };
    }

    loadState(state: any): void {
        if (!state) return;
        this.phase = state.phase;

        this.enemies = state.enemies.map((eState: any) => {
            const existing = this.enemies.find(e => e.id === eState.id);
            if (existing) {
                (existing as any).loadState(eState);
                return existing;
            }
            return eState;
        });

        this.defeatedEnemies = state.defeatedEnemies;
        this.blockedEnemies = new Set(state.blockedEnemies);
        this.totalDamage = state.totalDamage;
        this.woundsReceived = state.woundsReceived;

        this.unitManager.loadState(state);
    }
}

export default Combat;
