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

### Changed
- ActionManager now delegates undo/redo to dedicated UndoManager
- HandRenderer uses new Card component with preview modal
- CombatUIManager uses new PhaseIndicator with progress bar and auto-advance
- Tutorial system rewritten with action-based auto-advancement

### Fixed
- Site tooltips after loading saved games (Site objects re-instantiated on load)
- TypeScript strict mode compliance across all new components

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