# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Karten-Effekte wirken jetzt:** Effekt-Schlüssel, die in den Kartendaten standen, aber nie angewendet wurden, laufen jetzt durch die Engine — betroffen sind 13 Karten-Definitionen (Agility/`blk_tac`, Banner of Fear, Battle Versatility, Concentration, Crystal Magic, Crystal of Insight, Crystallize, Mana Draw, Mana Storm, Mana Surge, Rage, Threaten, Will Focus):
  - `move: N` neben einem anderen Effekt (Battle Versatility, Rage stark) gibt Bewegungspunkte.
  - `type2`/`value2` als zweiter Effekt (Agility stark: Block 3 + Bewegung 2).
  - `type: 'draw'` zieht Karten (Concentration), `type: 'mana_token'` gibt Mana-Token in Kartenfarbe (Mana Storm), `type: 'crystal'` gibt einen Manakristall (Crystallize, max. 3 pro Farbe), `type: 'hand_limit'` erhöht das Handkarten-Limit dauerhaft (Will Focus).
  - `condition: 'reputation_loss'` kostet beim Ausspielen 1 Ansehen (Threaten).
- **`js/card/effectMeta.ts`:** zentrale Zuordnung Effekt-Typ → Engine-Eigenschaft samt UI-Labels. Effekt-Typen ohne Handler werden dort explizit geführt, statt still zu verschwinden.
- **Kartentooltip:** zeigt `Karten ziehen`, `Mana-Token`, `Manakristall`, `Handkarten-Limit` und Ansehens-Kosten; Effekt-Typen ohne Handler erscheinen als „noch nicht implementiert".
- **Map tiles:** Exploring spends 2 movement and lays the next 7-hex scenario tile on the open edge (terrain, one site, that site's enemies). The deck is built from `mapConfig.deck` or `deckDistribution` plus the scenario's site list, then shuffled with a seed from the scenario id. The start tile is left in place.

### Changed
- **Kartentooltip/Preview:** rendert nur noch echte Effektzeilen. Vorher leckten die internen Schlüssel `type`, `value`, `condition` als „• type influence (+influence)" in die UI.
- **Handkarten-Log** (`formatEffect`) nennt die neuen Effekte (🎴 Ziehen, 💎 Mana, 💠 Kristall, 🖐️ Handkarten-Limit, ⚖️ Ansehen).
- **`HeroInventory.addCrystal`:** legt fehlende Farb-Slots (Gold/Schwarz) an, damit Karten wie Crystal Magic nicht ins Leere laufen; Deckel von 3 pro Farbe bleibt.
- Scenario goal sites from `sitePlacements` are no longer dropped onto the start tile. They arrive only when that tile is explored. The start tile keeps its terrain and gains one unguarded village.
- Reputation changes the influence price of healing, recruiting, and learning cards at sites. The shown price is the base minus `getReputationModifier()`, and it never drops below 0.
- Dungeon, ruin, tomb, and spawning-ground rewards for an artifact, spell, or advanced action place a real card from `SAMPLE_ARTIFACTS`, `SAMPLE_SPELLS`, or `SAMPLE_ADVANCED_ACTIONS` onto the hero discard pile. A reward name that matches a card grants that card.
- Dungeon, ruin, tomb, and spawning-ground unit rewards place a real unit from `UNIT_INFO` onto the hero via `addUnit`. A reward name that matches a unit grants that unit. A full command limit adds no unit.
- **Intuition-P2:** Pfad-Hover (gestrichelte Route + Kosten) in Bewegung
- **Site-Modal:** empfohlene Primäraktion groß, Rest unter „Weitere Aktionen“
- **Stark-Mana-Cue** auf Handkarten (✓/✗ + grüner/roter Mana-Ring)
- **Coach-Strip** über der Action-Bar: eine priorisierte „Was jetzt?“-Zeile
  (Bewegung / Karten spielen / Site / Heilung / Kampfphasen / Zugende)
- **Kampfphasen-Stepper** (Fern → Block → Angriff → Ende) unter dem Coach
- **Karten-Kontext:** empfohlene Karten leuchten (Block/Angriff/Fern/Bewegung),
  unpassende Phasen-Karten werden gedimmt mit Tooltip-Grund; Wunden disabled
- **Effekt-Icons** auf Handkarten (👣⚔️🛡️💬💚) für schnelles Scannen
- i18n-Keys `ui.coach.*` und `ui.cardReasons.*` (de/en)
- **Intuition-P0:** Live-Kampfvorschau (Block have/need, Wunden, Besiegbar)
- **Trait-Chips** mit Kurztext + Phasen-Highlight (z. B. 💨 2× Block in Block-Phase)
- **Hex-Bewegungskosten** auf erreichbaren Feldern; **rote Hexes** = Kampf startet
- **Auto-Skip leerer Fernkampf-Phase** wenn keine Fern-/Belagerungskarten
- Coach nutzt Live-Zahlen: `Block 3/8 · sonst 2 Wunden`, `Angriff 5 — besiegbar: …`
- **Intuition-P1:** Coach klickbar (highlightet Karten/Buttons oder führt Phase fort)
- **Card-Play-Preview:** eine Zeile Effekt + Stark/Mana auf der Handkarte
- **Smart End Turn:** Warnungen bei restlichen MP, Heilung, Site, Move-Karten

### Fixed
- Winning a fight on a mine, keep, mage tower, dungeon, ruin, tomb, labyrinth, spawning ground, den, or magic glade marks that site conquered. The site is the one under the hero when the fight starts. Defeat and retreat leave it alone, and the next fight does not clear an older site. Village, monastery, and city are unchanged.
- Site fights that passed a plain enemy object into combat now build an `Enemy` inside `initiateCombat`, so block and damage can call `getBlockRequirement` and `getEffectiveAttack`. An enemy that already has those methods is left unchanged. Summoners still summon.
- In the damage phase, clicking a unit assigns that enemy's damage to the unit. Block, attack, and ranged clicks still activate the unit. An assassin still forces the wounds onto the hero.
- Action-Bar Kampf-Aktionen erkannten Phasen in falscher Großschreibung
  (`BLOCK` vs `block`) — normalisiert auf lowercase Constants

## [1.1.0] - 2026-07-12

### Added
- Undo/Redo Manager with keyboard shortcuts (Ctrl+Z/Ctrl+Y) and toolbar buttons
- AI Personality System (7 archetypes: Aggressive, Defensive, Balanced, Tactical, Berserker, Cowardly, Patrol)
- Interactive Tutorial System (11 steps covering movement, cards, mana, combat phases)
- UI Component System (Button, Card, PhaseIndicator) with TypeScript interfaces and CSS custom properties
- Full integration of new UI components into HandRenderer and CombatUIManager
- Contextual Action Bar, Card Hover Tooltips, Phase Indicator (Phase 1 UX: Design Tokens, Base Styles & Component System)
- Quick Wins: Combat Log Filterbar, Auto-Save Timer (30s), Undo Stack Visualisierung, Haptic Feedback, End-Turn Confirm, Animation Speed control
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