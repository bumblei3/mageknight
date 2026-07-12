# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Undo/Redo Manager with keyboard shortcuts (Ctrl+Z/Ctrl+Y) and toolbar buttons
- AI Personality System (7 archetypes: Aggressive, Defensive, Balanced, Tactical, Berserker, Cowardly, Patrol)
- Interactive Tutorial System (11 steps covering movement, cards, mana, combat phases)
- UI Component System (Button, Card, PhaseIndicator) with TypeScript interfaces and CSS custom properties
- Full integration of new UI components into HandRenderer and CombatUIManager
- Contextual Action Bar, Card Hover Tooltips, Phase Indicator (Phase 1 UX: Design Tokens, Base Styles & Component System)
- Quick Wins: Combat Log Filterbar, Auto-Save Timer (30s), Undo Stack Visualisierung, Haptic Feedback, End-Turn Confirm, Animation Speed control
- Mana Prediction (foundation)
- Spells: 6 missing spells added → 16/16 complete
- Advanced Actions: 24/24 complete
- Site Rewards system (Phase 2 rules completeness)
- 3D/Graphics: SpriteAnimationSystem + GPU ParticleSystem integration, full Post-Processing pipeline (DOF), HexShaderManager + DynamicLightingManager
- GitHub Pages deploy job in CI

### Changed
- ActionManager now delegates undo/redo to dedicated UndoManager
- HandRenderer uses new Card component with preview modal
- CombatUIManager uses new PhaseIndicator with progress bar and auto-advance
- Tutorial system rewritten with action-based auto-advancement
- CI: E2E tests made non-blocking (continue-on-error), master branch added to workflow triggers
- Coverage boosted across core modules: SiteRewards 4%→99%, Site handlers (Keep/Monastery/Village/Labyrinth/MageTower) from 0%, AttackPhase 80%→91%, hero.ts 77%→90%

### Fixed
- Site tooltips after loading saved games (Site objects re-instantiated on load)
- TypeScript strict mode compliance across all new components
- Save/Load round-trip: restore q/r on hexes after load
- BossEnemy starts at currentHealth=0 when explicitly set
- Stabilized flaky ui_and_combat_flow time-transition test; auto-accept native dialogs in headless E2E

## [1.0.0] - 2026-06-16

### Added
- Core game engine: Hex grid, Combat system (Ranged/Block/Damage/Attack phases)
- Hero system: Goldyx, Norowas, Tovak, Arythea with unique skills and decks
- Enemy AI with 7 personality archetypes and combat behaviors
- Scenario system: Mining Expedition, Volkare's Quest, Dungeon Lords
- Site interactions: Villages, Keeps, Mage Towers, Monasteries, Dungeons, Cities
- Hero skills, artifacts, units, spells, artifacts
- PWA support with offline play (Workbox)
- Save/Load system with IndexedDB
- Achievement system
- Statistics tracking
- Internationalization (English/German)
- Tutorial system (basic)

### Technical
- Event-driven architecture with global EventBus
- Web Worker for AI pathfinding
- Modular UI with specialized renderers
- TypeScript strict mode with ESLint
- Vitest unit tests (2500+)
- Playwright E2E tests
- Vite build with PWA support
- Code splitting and lazy loading