import { StatusEffectManager } from './statusEffects.js';
// Enemy types imported as needed
import { COMBAT_PHASES } from './constants.js';
import { logger } from './logger.js';
import { t } from './i18n/index.js';
import { BlockingEngine } from './combat/BlockingEngine.js';
import { DamageSystem } from './combat/DamageSystem.js';
import { CombatCombos } from './combat/CombatCombos.js';
import { CombatPredictor } from './combat/CombatPredictor.js';

// New Sub-Modules
import { CombatUnitManager } from './combat/CombatUnitManager.js';
import { RangedPhase } from './combat/RangedPhase.js';
import { AttackPhase } from './combat/AttackPhase.js';

// For backward compatibility
export const COMBAT_PHASE = COMBAT_PHASES;

export class Combat {
    constructor(hero, enemies) {
        this.hero = hero;
        this.enemies = Array.isArray(enemies) ? enemies : [enemies];
        this.enemy = this.enemies[0]; // For backward compatibility with CombatOrchestrator
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

        this.summonedEnemies = new Map(); // Track original summoners: summonedId -> originalEnemy
    }

    // Proxy properties for Unit Points to UnitManager
    get unitAttackPoints() { return this.unitManager.unitAttackPoints; }
    set unitAttackPoints(v) { this.unitManager.unitAttackPoints = v; }

    get unitBlockPoints() { return this.unitManager.unitBlockPoints; }
    set unitBlockPoints(v) { this.unitManager.unitBlockPoints = v; }

    get unitRangedPoints() { return this.unitManager.unitRangedPoints; }
    set unitRangedPoints(v) { this.unitManager.unitRangedPoints = v; }

    get unitSiegePoints() { return this.unitManager.unitSiegePoints; }
    set unitSiegePoints(v) { this.unitManager.unitSiegePoints = v; }

    get activatedUnits() { return this.unitManager.activatedUnits; }
    set activatedUnits(v) { this.unitManager.activatedUnits = v; }

    // Start combat
    start() {
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

    // Ranged phase - player uses ranged/siege attacks
    rangedPhase() {
        return this.rangedPhaseController.update(this.enemies);
    }

    // Attempt to defeat enemies with Ranged/Siege Attack
    rangedAttackEnemy(enemy, rangedValue, siegeValue, element = 'physical') {
        return this.rangedPhaseController.executeAttack(enemy, rangedValue, siegeValue, element);
    }

    // End ranged phase and proceed to block
    endRangedPhase() {
        if (this.phase !== COMBAT_PHASES.RANGED) {
            return { error: t('ui.phases.ranged') };
        }

        // Check if all enemies dead
        if (this.enemies.length === 0) {
            return this.endCombat();
        }

        // Handle Summoning before entering block phase
        this.handleSummoning();

        this.phase = COMBAT_PHASES.BLOCK;
        return {
            phase: this.phase,
            message: t('combat.blockStarted')
        };
    }

    // Handle enemies with summoner ability
    handleSummoning() {
        this.rangedPhaseController.handleSummoning(this.enemies, this.defeatedEnemies);
    }

    // Block phase - player plays blocks against enemy attacks
    blockPhase() {
        if (this.phase !== COMBAT_PHASES.BLOCK) {
            return { error: t('ui.phases.block') };
        }

        // Calculate total enemy attack (unblocked enemies only)
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
    blockEnemy(enemy, blockInput, movementPoints = 0) {
        if (this.phase !== COMBAT_PHASES.BLOCK) {
            console.log('DEBUG: blockEnemy Phase Warning. Current:', this.phase, 'Expected:', COMBAT_PHASES.BLOCK);
            return { success: false, error: t('ui.phases.block') };
        }

        if (this.blockedEnemies.has(enemy.id)) {
            return { success: false, message: t('combat.alreadyBlocked') };
        }

        const result = this.blockingEngine.calculateBlock(enemy, blockInput, this.unitBlockPoints, movementPoints);

        if (result.success && result.blocked) {
            this.blockedEnemies.add(enemy.id);
            // Deduct unit points if used
            if (result.unitPointsConsumed > 0) {
                this.unitBlockPoints = 0; // consumed
            }
        }

        return result;
    }

    // End block phase and move to damage phase
    endBlockPhase() {
        if (this.phase !== COMBAT_PHASES.BLOCK) {
            return { error: t('ui.phases.block') };
        }

        this.phase = COMBAT_PHASES.DAMAGE;
        return this.damagePhase();
    }

    // Damage phase - calculate and assign damage
    damagePhase() {
        if (this.phase !== COMBAT_PHASES.DAMAGE) {
            return { error: t('ui.phases.combat') };
        }

        // Identify unblocked enemies
        // We filter out fully blocked enemies.
        // Note: this.blockedEnemies contains IDs.
        this.unblockedEnemies = this.enemies.filter(e => !this.blockedEnemies.has(e.id));

        // If no unblocked enemies, skip to Attack
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

        // Calculate potential total damage (for display)
        this.totalDamage = this.unblockedEnemies.reduce((sum, e) => sum + e.getEffectiveAttack(), 0);

        // We STAY in DAMAGE phase.
        // We DO NOT auto-apply damage yet.
        // The user must click "Continue/Confirm" to apply 'remaining' damage to Hero.

        return {
            totalDamage: this.totalDamage,
            unblockedEnemies: this.unblockedEnemies,
            message: t('combat.assignDamage'),
            nextPhase: COMBAT_PHASES.DAMAGE, // Explicitly stay
            waitingForAssignment: true
        };
    }

    // Resolves the Damage Phase (applies remaining damage to hero)
    resolveDamagePhase() {
        if (this.phase !== COMBAT_PHASES.DAMAGE) return;

        // Calculate wounds from REMAINING unblocked enemies (or partially blocked if we had partials, but we don't yet)
        // Actually, assignDamageToUnit should have REMOVED enemies from this.unblockedEnemies or marked them as 'handled'.

        const activeUnblocked = this.unblockedEnemies.filter(e => !e.damageAssigned);

        // Calculate wounds
        const result = this.damageSystem.calculateDamage(this.hero, activeUnblocked);

        this.totalDamage = result.totalDamage; // Updated total
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
    assignDamageToUnit(unit, enemyId = null) {
        if (this.phase !== COMBAT_PHASES.DAMAGE) {
            return { success: false, message: t('combat.phaseDamageOnly') };
        }

        // Find candidate enemy
        // If enemyId provided, use that. Else pick 'best' one (highest damage non-assassin?)
        let enemy = null;
        if (enemyId) {
            enemy = this.unblockedEnemies.find(e => e.id === enemyId);
        } else {
            // Auto-pick: First non-assassin that hasn't acted
            enemy = this.unblockedEnemies.find(e => !e.damageAssigned && !e.assassin);
        }

        if (!enemy) {
            if (this.unblockedEnemies.some(e => e.assassin && !e.damageAssigned)) {
                return { success: false, message: t('combat.assassinateRestriction', { enemy: 'Assassin' }) };
            }
            return { success: false, message: t('combat.noEnemyToAssign') };
        }

        if (enemy.damageAssigned) {
            return { success: false, message: t('combat.alreadyAssigned') };
        }

        // Unit Validation
        if (unit.wounds > 0 && !unit.isResistantTo(enemy.attackType)) {
            // Wounded units usually can't take another wound unless Resistant?
            // MK Rule: Wounded unit takes wound -> Destroyed.
            // We allow it, logic handles destruction.
        }

        const result = this.damageSystem.assignDamageToUnit(unit, enemy);

        if (result.success) {
            enemy.damageAssigned = true; // Mark enemy as handled
            // Recalculate pending totals for UI
            this.totalDamage -= enemy.getEffectiveAttack();
            return { success: true, message: t('combat.damageAssignedTo', { unit: unit.getName(), enemy: enemy.name }), unitDestroyed: result.unitDestroyed };
        } else {
            return result;
        }
    }

    /**
     * Handles the discard effect for Paralyze.
     * Should be called when paralyzeTriggered is true.
     */
    handleParalyzeEffect() {
        if (!this.paralyzeTriggered) return 0;

        // Count wounds received to determine how many cards to discard
        const discarded = this.hero.discardNonWoundCards(this.woundsReceived);
        this.paralyzeTriggered = false; // Reset after handling
        return discarded;
    }

    // Attack phase - player attacks enemies
    attackPhase() {
        return this.attackPhaseController.update(this.enemies);
    }

    // Activate a unit to contribute to combat
    activateUnit(unit) {
        return this.unitManager.activateUnit(unit, this.phase);
    }

    // Attempt to defeat enemies with attack (includes unit contributions)
    attackEnemies(attackValue, attackElement = 'physical', targetEnemies = null) {
        return this.attackPhaseController.executeAttack(attackValue, attackElement, targetEnemies);
    }

    // Combo System - delegated to CombatCombos
    detectCombo(playedCards) {
        return CombatCombos.detectCombo(playedCards);
    }

    // Helper delegations for backward compatibility if needed, else remove
    calculateCriticalHit(baseAttack, critChance = 0.15) {
        return CombatCombos.calculateCriticalHit(baseAttack, critChance);
    }

    applyComboBonus(baseValue, combo) {
        return CombatCombos.applyComboBonus(baseValue, combo);
    }

    // ============ STATUS EFFECTS ============

    // Apply a status effect to hero
    applyEffectToHero(effectType, source = null) {
        return this.statusEffects.applyToHero(this.hero, effectType, source);
    }

    // Apply a status effect to an enemy
    applyEffectToEnemy(enemy, effectType, source = null) {
        return this.statusEffects.applyToEnemy(enemy, effectType, source);
    }

    // Get all effects on hero
    getHeroEffects() {
        return this.statusEffects.getHeroEffects();
    }

    // Get all effects on an enemy
    getEnemyEffects(enemy) {
        return this.statusEffects.getEnemyEffects(enemy);
    }

    // Process effects at phase start (called by game.js)
    processPhaseEffects() {
        const results = {
            heroDamage: 0,
            enemyDamage: [],
            messages: []
        };

        // Process hero effects
        const heroResult = this.statusEffects.processHeroPhaseStart(this.hero);
        if (heroResult && heroResult.damage) {
            results.heroDamage = heroResult.damage;
            results.messages.push(t('combat.heroStatusDamage', { amount: heroResult.damage }));
        }

        // Process enemy effects
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
    endCombat() {
        // Process end-of-combat effects (like Poison)
        const endResult = this.statusEffects.processCombatEnd(this.hero);
        if (endResult.wounds > 0) {
            for (let i = 0; i < endResult.wounds; i++) {
                this.hero.takeWound();
            }
            this.woundsReceived += endResult.wounds;
        }

        // Clear all status effects
        this.statusEffects.clear();

        this.phase = COMBAT_PHASES.COMPLETE;

        const allDefeated = this.enemies.length === 0;
        const result = {
            victory: allDefeated,
            defeatedEnemies: this.defeatedEnemies,
            remainingEnemies: this.enemies,
            woundsReceived: this.woundsReceived,
            fameGained: this.defeatedEnemies.reduce((sum, e) => sum + e.fame, 0),
            poisonWounds: endResult.wounds,
            message: allDefeated ? t('game.victory') : t('combat.combatEnded')
        };

        return result;
    }

    /**
     * Calculates the predicted outcome based on current actions
     * @param {number} currentAttack - Player's accumulated attack points
     * @param {number} currentBlock - Player's accumulated block points (not yet assigned)
     * @returns {Object} Prediction details
     */
    getPredictedOutcome(currentAttack = 0, currentBlock = 0) {
        return CombatPredictor.getPredictedOutcome(this, currentAttack, currentBlock);
    }

    // Check if combat is complete
    isComplete() {
        return this.phase === COMBAT_PHASES.COMPLETE;
    }

    // Get current combat state
    getState() {
        return {
            phase: this.phase,
            enemies: this.enemies.map(e => e.getState()), // Save full enemy state (health etc)
            defeatedEnemies: this.defeatedEnemies,
            blockedEnemies: Array.from(this.blockedEnemies),
            totalDamage: this.totalDamage,
            woundsReceived: this.woundsReceived,
            ...this.unitManager.getState() // Merge unit manager state (points, activated units)
        };
    }

    // Load state
    loadState(state) {
        if (!state) return;
        this.phase = state.phase;

        // Restore enemies
        this.enemies = state.enemies.map(eState => {
            const existing = this.enemies.find(e => e.id === eState.id);
            if (existing) {
                existing.loadState(eState);
                return existing;
            }
            return eState;
        });

        this.defeatedEnemies = state.defeatedEnemies;
        this.blockedEnemies = new Set(state.blockedEnemies);
        this.totalDamage = state.totalDamage;
        this.woundsReceived = state.woundsReceived;

        // Load unit manager state
        this.unitManager.loadState(state);
    }
}

export default Combat;
