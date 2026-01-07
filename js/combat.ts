import { StatusEffectManager } from './statusEffects.js';
import { COMBAT_PHASES } from './constants.js';
import { logger } from './logger.js';
import { t } from './i18n/index.js';
import { BlockingEngine } from './combat/BlockingEngine.js';
import { DamageSystem } from './combat/DamageSystem.js';
import { CombatCombos } from './combat/CombatCombos.js';
import { CombatPredictor } from './combat/CombatPredictor.js';
import { CombatUnitManager } from './combat/CombatUnitManager.js';
import { RangedPhase } from './combat/RangedPhase.js';
import { AttackPhase } from './combat/AttackPhase.js';
import { Hero } from './hero.js';
import { Enemy } from './enemy.js';
import { Card } from './card.js';

// For backward compatibility
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

    constructor(hero: Hero, enemies: Enemy | Enemy[]) {
        this.hero = hero;
        this.enemies = Array.isArray(enemies) ? enemies : [enemies];
        this.enemy = this.enemies[0];
        this.phase = COMBAT_PHASES.NOT_IN_COMBAT;
        this.defeatedEnemies = [];
        this.blockedEnemies = new Set();
        this.totalDamage = 0;
        this.woundsReceived = 0;

        // Status Effects
        this.statusEffects = new StatusEffectManager();

        // Sub-Systems
        this.blockingEngine = new BlockingEngine();
        this.damageSystem = new DamageSystem();

        // New Managers
        this.unitManager = new CombatUnitManager();
        this.rangedPhaseController = new RangedPhase(this);
        this.attackPhaseController = new AttackPhase(this);

        this.summonedEnemies = new Map();
    }

    // Proxy properties
    get unitAttackPoints(): number { return this.unitManager.unitAttackPoints; }
    set unitAttackPoints(v: number) { this.unitManager.unitAttackPoints = v; }

    get unitBlockPoints(): number { return this.unitManager.unitBlockPoints; }
    set unitBlockPoints(v: number) { this.unitManager.unitBlockPoints = v; }

    get unitRangedPoints(): number { return this.unitManager.unitRangedPoints; }
    set unitRangedPoints(v: number) { this.unitManager.unitRangedPoints = v; }

    get unitSiegePoints(): number { return this.unitManager.unitSiegePoints; }
    set unitSiegePoints(v: number) { this.unitManager.unitSiegePoints = v; }

    get activatedUnits(): any[] { return this.unitManager.activatedUnits; }
    set activatedUnits(v: any[]) { this.unitManager.activatedUnits = v; }

    // Start combat
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

    // Ranged phase
    rangedPhase(): any {
        return this.rangedPhaseController.update(this.enemies);
    }

    // Attempt to defeat enemies with Ranged/Siege Attack
    rangedAttackEnemy(enemy: Enemy, rangedValue: number, siegeValue: number, element = 'physical'): any {
        return this.rangedPhaseController.executeAttack(enemy, rangedValue, siegeValue, element);
    }

    // End ranged phase
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

    // Handle enemies with summoner ability
    handleSummoning(): void {
        this.rangedPhaseController.handleSummoning(this.enemies, this.defeatedEnemies);
    }

    // Block phase
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

    // Attempt to block an enemy
    blockEnemy(enemy: Enemy, blockInput: any, movementPoints = 0): BlockResult {
        if (this.phase !== COMBAT_PHASES.BLOCK) {
            return { success: false, error: t('ui.phases.block') };
        }

        if (this.blockedEnemies.has(enemy.id)) {
            return { success: false, message: t('combat.alreadyBlocked') };
        }

        const result = this.blockingEngine.calculateBlock(enemy, blockInput, this.unitBlockPoints, movementPoints);

        if (result.success && result.blocked) {
            this.blockedEnemies.add(enemy.id);
            if (result.unitPointsConsumed > 0) {
                this.unitBlockPoints = 0;
            }
        }

        return result;
    }

    // End block phase
    endBlockPhase(): PhaseResult {
        if (this.phase !== COMBAT_PHASES.BLOCK) {
            return { error: t('ui.phases.block') };
        }

        this.phase = COMBAT_PHASES.DAMAGE;
        return this.damagePhase();
    }

    // Damage phase
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
            unblockedEnemies: this.unblockedEnemies as any, // Cast to any to avoid property issues in UI
            message: t('combat.assignDamage'),
            nextPhase: COMBAT_PHASES.DAMAGE,
            waitingForAssignment: true
        };
    }

    // Resolves the Damage Phase
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

    // Assign damage to a unit from an enemy
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

    // Attack phase
    attackPhase(): any {
        return this.attackPhaseController.update(this.enemies);
    }

    // Activate a unit
    activateUnit(unit: any): any {
        return this.unitManager.activateUnit(unit, this.phase);
    }

    // Attempt to defeat enemies with attack
    attackEnemies(attackValue: number, attackElement = 'physical', targetEnemies: Enemy[] | null = null): any {
        return this.attackPhaseController.executeAttack(attackValue, attackElement, targetEnemies);
    }

    // Combo System
    detectCombo(playedCards: Card[]): any {
        return (CombatCombos as any).detectCombo(playedCards);
    }

    calculateCriticalHit(baseAttack: number, critChance = 0.15): number {
        return (CombatCombos as any).calculateCriticalHit(baseAttack, critChance);
    }

    applyComboBonus(baseValue: number, combo: any): number {
        return (CombatCombos as any).applyComboBonus(baseValue, combo);
    }

    // ============ STATUS EFFECTS ============

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

    // End combat
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
        return {
            victory: allDefeated,
            defeatedEnemies: this.defeatedEnemies,
            remainingEnemies: this.enemies,
            woundsReceived: this.woundsReceived,
            fameGained: this.defeatedEnemies.reduce((sum, e) => sum + e.fame, 0),
            poisonWounds: endResult.wounds,
            message: allDefeated ? t('game.victory') : t('combat.combatEnded')
        };
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
            enemies: this.enemies.map(e => (e as any).getState()),
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
