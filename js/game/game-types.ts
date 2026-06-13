/**
 * Shared type definitions for Mage Knight Game
 * Central type definitions to avoid circular dependencies and reduce `any` usage
 */

import { Hero } from '../hero';
import { Enemy } from '../enemy';
import { UI as UIType } from '../ui';
import { HexGrid } from '../hexgrid';
import { Terrain } from '../terrain';
import { ManaSource } from '../mana';
import { EnemyAI } from '../enemyAI';
import { ParticleSystem } from '../particles';
import { WeatherSystem } from '../particles/WeatherSystem';
import { TimeManager } from '../timeManager';
import { MapManager } from '../mapManager';
import { WorldEventManager } from '../worldEvents';
import { SiteInteractionManager } from '../siteInteraction';
import { DebugManager } from '../debug';
import { Combat } from '../combat';
import { SoundManager } from '../soundManager';
import { AchievementManager } from '../achievements';
import { StatisticsManager } from '../statistics';
import { animator } from '../animator';

// ============================================================================
// Core Game State Types
// ============================================================================

export type GameStateValue = 'playing' | 'combat' | 'victory' | 'defeat';

export interface Position {
    q: number;
    r: number;
}

export interface HexCoordinates extends Position {}

// Forward declarations for game sub-modules to avoid circular imports
export interface TurnManager {
    endTurn(): void;
    endRound(): void;
}
export interface InteractionController {
    handleCanvasMouseMove(event: MouseEvent): void;
}
export interface ShortcutManager {
    handleKeyDown(event: KeyboardEvent): void;
}
export interface InputController {
    handleClick(event: MouseEvent): void;
}
export interface RenderController {
    render(): void;
}
export interface PhaseManager {
    updatePhaseIndicator(): void;
}
export interface EntityManager {
    removeEnemy(enemy: Enemy): void;
}
export interface ActionManager {
    saveCheckpoint(): void;
    clearHistory(): void;
}
export interface GameStateManager {
    saveGame(slotId: string): void;
    loadGame(slotId: string): void;
    openScenarioSelection(): Promise<void>;
}
export interface CombatOrchestrator {
    initiateCombat(enemies: Enemy | Enemy[]): void;
    playCardInCombat(index: number, card: any, useStrong: boolean): void;
}
export interface HeroControllerType {
    // Minimal interface
}
export interface VolkareControllerType {
    // Minimal interface
}
export interface LevelUpManagerType {
    handleLevelUp(result: any): void;
}
export interface RewardManagerType {
    showArtifactChoice(): void;
    showSpellChoice(): void;
}
export interface ScenarioManagerType {
    checkVictory(): { victory: boolean; message: string } | false;
    getObjectivesText(): string;
}
export interface TouchControllerType {
    // Minimal interface
}

// ============================================================================
// Minimal Game API for sub-components that need game reference
// ============================================================================

export interface GameAPI {
    // Core state
    gameState: GameStateValue;
    isTestEnvironment: boolean;
    
    // Essential managers
    ui: UIType;
    hexGrid: HexGrid;
    hero: Hero;
    terrain: Terrain;
    timeManager: TimeManager;
    manaSource: ManaSource;
    enemies: Enemy[];
    combat: Combat | null;
    
    // Essential methods
    addLog: (message: string, type?: string) => void;
    updateStats: () => void;
    renderHand: () => void;
    render: () => void;
    getPredictedOutcome?: (attack: number, block: number) => any;
}

// Extended Game API for CombatOrchestrator and other components
export interface GameAPIExtended extends GameAPI {
    // Managers
    combatOrchestrator: CombatOrchestrator;
    entityManager: EntityManager;
    scenarioManager: ScenarioManagerType;
    levelUpManager: LevelUpManagerType;
    rewardManager: RewardManagerType;
    siteManager: SiteInteractionManager;
    statisticsManager: StatisticsManager;
    sound: SoundManager | null;
    particleSystem: ParticleSystem;
    weatherSystem: WeatherSystem;
    mapManager: MapManager;
    worldEventManager: WorldEventManager;
    actionManager: ActionManager;
    stateManager: GameStateManager;
    phaseManager: PhaseManager;
    heroController: HeroControllerType;
    volkare: VolkareControllerType;
    turnManager: TurnManager;
    interactionController: InteractionController;
    shortcutManager: ShortcutManager;
    inputController: InputController;
    renderController: RenderController;
    touchController: TouchControllerType;
    debug: DebugManager;
    achievementManager: AchievementManager;
    animator: typeof animator;
    
    // State
    reachableHexes: HexCoordinates[];
    selectedCard: any | null;
    movementMode: boolean;
    
    // Methods
    setGameTimeout: (callback: () => void, delay: number) => void;
    clearGameTimeout: (id: number) => void;
    startNewGame: (scenarioId: string | null, heroId: string) => void;
    initializeSystem: () => void;
    updatePhaseIndicator: () => void;
    showNotification: (message: string, type: string) => void;
    checkAndShowAchievements: () => void;
}

// ============================================================================
// Save Manager Interface (for legacy compatibility)
// ============================================================================

export interface SaveManagerAPI {
    saveGame: (slotId: string) => void;
    loadGame: (slotId: string) => void;
    autoSave: () => void;
}

// ============================================================================
// Re-export commonly used types for convenience
// ============================================================================

export type { Hero } from '../hero';
export type { Enemy } from '../enemy';
export type { HexGrid } from '../hexgrid';
export type { Terrain } from '../terrain';
export type { ManaSource } from '../mana';
export type { EnemyAI } from '../enemyAI';
export type { ParticleSystem } from '../particles';
export type { WeatherSystem } from '../particles/WeatherSystem';
export type { TimeManager } from '../timeManager';
export type { MapManager } from '../mapManager';
export type { WorldEventManager } from '../worldEvents';
export type { SiteInteractionManager } from '../siteInteraction';
export type { DebugManager } from '../debug';
export type { Combat } from '../combat';
export type { SoundManager } from '../soundManager';
export type { AchievementManager } from '../achievements';
export type { StatisticsManager } from '../statistics';
import TutorialManager from '../tutorialManager';
// export type { TutorialManager } from '../tutorialManager';
export type { UI } from '../ui';

// Animator type
export type AnimatorType = typeof animator;

// Position type
export interface Position {
    q: number;
    r: number;
}

export interface HexCoordinates extends Position {}

// Core exports
export type GameState = GameStateValue;

// Forward declarations for game sub-modules
export interface TurnManager {
    endTurn(): void;
    endRound(): void;
}
export interface InteractionController {
    handleCanvasMouseMove(event: MouseEvent): void;
}
export interface ShortcutManager {
    handleKeyDown(event: KeyboardEvent): void;
}
export interface InputController {
    handleClick(event: MouseEvent): void;
}
export interface RenderController {
    render(): void;
}
export interface PhaseManager {
    updatePhaseIndicator(): void;
}
export interface EntityManager {
    removeEnemy(enemy: Enemy): void;
}
export interface ActionManager {
    saveCheckpoint(): void;
    clearHistory(): void;
}
export interface GameStateManager {
    saveGame(slotId: string): void;
    loadGame(slotId: string): void;
    openScenarioSelection(): Promise<void>;
}
export interface CombatOrchestrator {
    initiateCombat(enemies: Enemy | Enemy[]): void;
    playCardInCombat(index: number, card: any, useStrong: boolean): void;
}
export interface HeroControllerType {
    // Minimal interface
}
export interface VolkareControllerType {
    // Minimal interface
}
export interface LevelUpManagerType {
    handleLevelUp(result: any): void;
}
export interface RewardManagerType {
    showArtifactChoice(): void;
    showSpellChoice(): void;
}
export interface ScenarioManagerType {
    checkVictory(): { victory: boolean; message: string } | false;
    getObjectivesText(): string;
}
export interface TouchControllerType {
    // Minimal interface
}

// Save Manager Interface
export interface SaveManagerAPI {
    saveGame: (slotId: string) => void;
    loadGame: (slotId: string) => void;
    autoSave: () => void;
}