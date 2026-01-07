// Status Effect Manager for Combat
// Handles temporary effects like Poison, Paralyze, Ice Block, etc.

export const EFFECT_TYPES = {
    STUN: 'stun',
    BURN: 'burn',
    FREEZE: 'freeze',
    POISON: 'poison',
    WEAKEN: 'weaken',
    SHIELD: 'shield',
    ENRAGE: 'enrage'
} as const;

export const EFFECT_DEFINITIONS: Record<string, any> = {
    [EFFECT_TYPES.STUN]: { name: 'Betäubt', icon: '⚡', duration: 1, stackable: false, maxStacks: 1 },
    [EFFECT_TYPES.BURN]: { name: 'Brennend', icon: '🔥', duration: 3, stackable: true, maxStacks: 3 },
    [EFFECT_TYPES.FREEZE]: { name: 'Gefroren', icon: '❄️', duration: 2, stackable: false, maxStacks: 1 },
    [EFFECT_TYPES.POISON]: { name: 'Vergiftet', icon: '☠️', duration: -1, stackable: true, maxStacks: 5 },
    [EFFECT_TYPES.WEAKEN]: { name: 'Geschwächt', icon: '💔', duration: 2, stackable: true, maxStacks: 3 },
    [EFFECT_TYPES.SHIELD]: { name: 'Geschützt', icon: '🛡️', duration: 1, stackable: true, maxStacks: 5 },
    [EFFECT_TYPES.ENRAGE]: { name: 'Wütend', icon: '💢', duration: 2, stackable: false, maxStacks: 1 }
};

export class StatusEffect {
    type: string;
    name: string;
    icon: string;
    duration: number;
    remainingDuration: number;
    stackable: boolean;
    maxStacks: number;
    stacks: number;
    target: any;

    constructor(type: string, target: any) {
        const def = EFFECT_DEFINITIONS[type];
        this.type = type;
        this.name = def?.name || type;
        this.icon = def?.icon || '?';
        this.duration = def?.duration || 1;
        this.remainingDuration = this.duration === -1 ? -1 : this.duration;
        this.stackable = def?.stackable || false;
        this.maxStacks = def?.maxStacks || 1;
        this.stacks = 1;
        this.target = target;
    }

    addStack(): boolean {
        if (!this.stackable || this.stacks >= this.maxStacks) return false;
        this.stacks++;
        return true;
    }

    tick(): void {
        if (this.remainingDuration > 0) {
            this.remainingDuration--;
        }
    }

    isExpired(): boolean {
        return this.remainingDuration === 0;
    }
}

export interface EffectResult {
    damage?: number;
    wounds?: number;
    message?: string;
    [key: string]: any;
}

export class StatusEffectManager {
    heroEffects: Map<string, StatusEffect>;
    enemyEffects: Map<string, StatusEffect[]>;

    constructor() {
        this.heroEffects = new Map();
        this.enemyEffects = new Map();
    }

    applyToHero(hero: any, effectType: string, source: any = null): any {
        if (this.heroEffects.has(effectType)) {
            const existing = this.heroEffects.get(effectType)!;
            const stacked = existing.addStack();
            return { success: true, stacked, applied: false, effect: existing };
        }
        const effect = new StatusEffect(effectType, hero);
        this.heroEffects.set(effectType, effect);
        return { success: true, applied: true, stacked: false, effect };
    }

    applyToEnemy(enemy: any, effectType: string, source: any = null): any {
        if (!this.enemyEffects.has(enemy.id)) {
            this.enemyEffects.set(enemy.id, []);
        }
        const effects = this.enemyEffects.get(enemy.id)!;
        const existing = effects.find(e => e.type === effectType);
        if (existing) {
            existing.addStack();
            return { success: true, stacked: true, effect: existing };
        }
        const effect = new StatusEffect(effectType, enemy);
        effects.push(effect);
        return { success: true, applied: true, effect };
    }

    heroHasEffect(effectType: string): boolean {
        return this.heroEffects.has(effectType);
    }

    enemyHasEffect(enemy: any, effectType: string): boolean {
        const effects = this.enemyEffects.get(enemy.id) || [];
        return effects.some(e => e.type === effectType);
    }

    removeFromHero(hero: any, effectType: string): void {
        this.heroEffects.delete(effectType);
    }

    getHeroEffects(): StatusEffect[] {
        return Array.from(this.heroEffects.values());
    }

    getEnemyEffects(enemy: any): StatusEffect[] {
        return this.enemyEffects.get(enemy.id) || [];
    }

    processHeroPhaseStart(hero: any): EffectResult {
        let damage = 0;
        const toRemove: string[] = [];

        this.heroEffects.forEach((effect, type) => {
            if (type === EFFECT_TYPES.BURN) {
                damage += effect.stacks;
            }
            effect.tick();
            if (effect.isExpired()) {
                toRemove.push(type);
            }
        });

        toRemove.forEach(t => this.heroEffects.delete(t));
        return { damage };
    }

    processEnemyPhaseStart(enemies: any[]): { enemy: any, damage: number }[] {
        return [];
    }

    processCombatEnd(hero: any): EffectResult {
        let wounds = 0;
        const poisonEffect = this.heroEffects.get(EFFECT_TYPES.POISON);
        if (poisonEffect) {
            wounds = poisonEffect.stacks;
        }
        return { wounds };
    }

    clear(): void {
        this.heroEffects.clear();
        this.enemyEffects.clear();
    }

    static applyEffect(unit: any, effect: string) {
        if (!unit.statusEffects) unit.statusEffects = [];
        unit.statusEffects.push(effect);
    }

    static hasEffect(unit: any, effect: string): boolean {
        return unit.statusEffects && unit.statusEffects.includes(effect);
    }
}
