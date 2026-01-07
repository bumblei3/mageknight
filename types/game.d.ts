// Core game type declarations for Mage Knight

export interface Position {
    q: number;
    r: number;
}

export interface HeroStats {
    armor: number;
    handLimit: number;
    level: number;
    fame: number;
    reputation: number;
}

export interface Hero {
    id: string;
    name: string;
    position: Position;
    stats: HeroStats;
    tempMana: string[];
    crystals: Record<string, number>;
    wounds: number;
    takeManaFromSource(color: string): void;
    addCrystal(color: string): void;
    moveTo(q: number, r: number): void;
}

export interface EnemyStats {
    attack: number;
    armor: number;
    isSwift?: boolean;
    isFortified?: boolean;
    resistances?: string[];
}

export interface Enemy {
    id: string;
    type: string;
    name: string;
    position: Position;
    stats: EnemyStats;
    isDefeated: boolean;
    takeDamage(amount: number, type?: string): boolean;
}

export interface Card {
    id: string;
    name: string;
    type: 'action' | 'artifact' | 'spell' | 'wound';
    color: string;
    basicEffect: CardEffect;
    strongEffect?: CardEffect;
    sidewaysEffects?: Record<string, CardEffect>;
    isWound(): boolean;
}

export interface CardEffect {
    type: string;
    value: number;
    description?: string;
}

export interface HexData {
    q: number;
    r: number;
    terrain: string;
    revealed: boolean;
    site?: Site;
    enemy?: Enemy;
}

export interface Site {
    type: string;
    name: string;
    getIcon(): string;
    getName(): string;
    getInfo(): { description: string };
    getColor?(): string;
}

export interface ManaSource {
    getAvailableDice(isNight: boolean): ManaDie[];
    takeMana(index: number): string | null;
    reset(): void;
}

export interface ManaDie {
    color: string;
    available: boolean;
}

export interface GameState {
    gameState: 'menu' | 'playing' | 'combat' | 'paused';
    isNight: boolean;
    round: number;
    turn: number;
}

// Extend Window interface for global game access
declare global {
    interface Window {
        game: Game;
        debug?: unknown;
    }
}

export interface Game extends GameState {
    hero: Hero;
    hexGrid: HexGrid;
    manaSource: ManaSource;
    actionManager: ActionManager;
    combatOrchestrator: CombatOrchestrator;
    ui: UI;
    render(): void;
    addLog(message: string, type?: string): void;
    moveHero(q: number, r: number): Promise<void>;
    initiateCombat(enemy: Enemy): void;
}

export interface HexGrid {
    hexes: Map<string, HexData>;
    getHex(q: number, r: number): HexData | undefined;
    setHex(q: number, r: number, data: HexData): void;
    logic: {
        addHex(q: number, r: number): HexData;
        axialToPixelOffset(q: number, r: number): { x: number; y: number };
    };
    renderer: {
        axialToPixel(q: number, r: number): { x: number; y: number };
    };
}

export interface ActionManager {
    takeMana(index: number, color: string): string | null;
    moveHero(q: number, r: number): Promise<void>;
    explore(): void;
}

export interface CombatOrchestrator {
    initiateCombat(enemy: Enemy): void;
    currentCombat: Combat | null;
}

export interface Combat {
    enemy: Enemy;
    phase: 'ranged' | 'block' | 'attack' | 'damage';
}

export interface UI {
    setButtonEnabled(button: HTMLElement, enabled: boolean): void;
    showNotification(message: string, type?: string): void;
}
