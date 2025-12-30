# Technical Debt & Code Review Report

After a thorough audit of the Mage Knight codebase, I have identified several architectural bottlenecks and opportunities for technical improvement.

## 1. Monolithic Controllers
*   **Problem**: `game.js` (1778 lines) and `ui.js` (1006 lines) manage too many responsibilities. `game.js` handles input, state, rendering coordination, and system initialization.
*   **Impact**: These files are difficult to navigate, test, and refactor without side effects.
*   **Recommendation**: Extract logic into specialized services (e.g., `InputHandler`, `GameLoopManager`, `RenderController`).

## 2. Tight Coupling & Service Location
*   **Problem**: Most modules (`MapManager`, `EnemyAI`, `SiteInteractionManager`) take the entire `MageKnightGame` instance as a constructor argument.
*   **Impact**: This creates circular dependencies and makes it impossible to use modules in isolation (e.g., testing `EnemyAI` without a full `Game` object).
*   **Recommendation**: Transition to a **Dependency Injection** pattern where modules only receive the specific interfaces or data they need.

## 3. Ambiguous State Management
*   **Problem**: Game state is tracked via a combination of a `gameState` string, boolean flags (`movementMode`), and null-checks on systems (`this.combat !== null`).
*   **Impact**: State transitions are "leaky" and prone to race conditions or inconsistent UI states.
*   **Recommendation**: Implement a formal **Finite State Machine (FSM)** to explicitly define states (Movement, Combat, Exploration, EndTurn) and permitted transitions.

## 4. Lack of a Central Event System
*   **Problem**: Modules communicate via direct method calls (e.g., `this.game.ui.addLog()`).
*   **Impact**: Highly rigid code. Adding a new listener (e.g., an achievement unlocker) requires modifying the source module.
*   **Recommendation**: Introduce an **EventBus** or Observer pattern. Modules should emit events like `TURN_ENDED` or `ENEMY_DEFEATED`, and others can subscribe.

## 5. Magic Numbers & Hardcoded Config
*   **Problem**: Content data (terrain costs, enemy stats) and UI settings (colors, timing) are hardcoded within logic.
*   **Impact**: Tweaking game balance requires searching through multiple source files.
*   **Recommendation**: Centralize all game constants into a `config.js` or `constants.js` file.

---

## Priority Improvements for Phase 6
Based on this review, I propose the following immediate technical upgrades:
1.  **Central Constants**: Move all hardcoded values to `constants.js`.
2.  **EventBus Implementation**: Allow `Game` to notify `UI` and `Achievements` without direct coupling.
3.  **State Machine Refactor**: Cleanup the movement/combat state transitions in `game.js`.
4.  **UI Componentization**: Extract Toast and Modal logic from the main `UI` class into specialized components.
