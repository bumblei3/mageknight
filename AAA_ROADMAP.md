# Mage Knight - AAA Roadmap

*Status: Stand 2026-10-20 | Basis: 3490 Unit Tests (239 Dateien), 80%-Coverage-Gate grün (94.9% Stmts / 85.9% Branch), CI grün (Lint, Typecheck, Build, E2E, Deploy). Phase1 Visual AAA + Foundation-Hardening abgeschlossen. Solo-Fokus (kein Multiplayer). Echte Content-Zahlen: `npx tsx scripts/count_content.mts` (4 Helden, 20 Feinde, 8 Szenarien, 16 Spells, 24 Actions, 11 Unit-Typen, 12 Artefakte, 4 Skill-Gruppen).*

*Letzte echte Anpassung (2026-07-15): Skill-Gap A geschlossen — arythea + tovak haben jetzt eigene Skill-Gruppen (zuvor hard-coded 'goldyx' in HeroController + LevelUpManager).*

---

## 🎯 Vision: AAA-Qualität für ein Web-basiertes Mage Knight

**AAA** bedeutet hier:
- **Visuell**: Premium-Look, flüssige Animationen, konsistentes Design-System
- **Technisch**: Performant, barrierefrei, wartbar, fehlerfrei
- **Spielerisch**: Vollständige Rules-Abdeckung, balancierte KI, Wiederspielwert
- **Produktion**: Cross-Platform, PWA, Offline, Analytics, LiveOps-fähig

---

## 📊 Currently: "Indie Polish" → Target: "AAA Web Game"

| Dimension | Aktuell | AAA-Ziel |
|-----------|---------|----------|
| **Graphics** | Premium CSS/Canvas, 3D opt. | Cinematic Shaders, Particle Systems, Sprite Animation |
| **Audio** | Adaptive Musik + SFX (AdaptiveMusicManager) | Spatial Audio, Polish |
| **Rules Coverage** | ~99% (Core) — 24/24 Actions, 16/16 Spells, 10 Site-Handler, alle Unit-Typen | 100% (Spell Mastery `spell_effect` noch offen) |
| **AI** | Worker-basiert, regelbasiert + MCTS-Andockpunkt | MCTS/Neural, Schwierigkeitsgrade, Personality |
| **Content** | 4 Helden, 20 Feinde, 8 Szenarien, 24/24 Actions, 16/16 Spells, 11 Unit-Typen, 12 Artefakte, 4 Skill-Gruppen | 5. Held (optional), Modding-API |
| **Multiplayer** | Nein (Solo-Fokus, bewusst) | Nein (bewusst ausgeschlossen) |
| **Accessibility** | Basis (Shortcuts, ARIA) | WCAG 2.1 AA, Screenreader, Colorblind, Remapping |
| **Platform** | Web (Desktop/Mobile) | PWA, Desktop (Tauri), Konsolen-Port möglich |
| **LiveOps** | Nein | Daily Runs, Leaderboards, Achievements, Cloud Save |

---

## 🗓️ Roadmap: 6 Phasen (ca. 12-18 Monate)

### Phase 0: Foundation Hardening (Woche 1-2) ✅ **ABGESCHLOSSEN**
- [x] Design Token System konsolidiert (Single Source of Truth)
- [x] Legacy CSS Variablen entfernt
- [x] Build/Lint/Typecheck/Tests grün
- [x] CI/CD Pipeline stabil

---

## 🎨 Phase1: Visuelle AAA-Qualität (Woche 3-8) ✅ **ABGESCHLOSSEN** (Stand 2026-07-15)

*Shader-Pipeline, Particle System v2, Sprite Animation, Dynamic Lighting, Adaptive Music + SFX, 13 Artefakte, Touch-Controller, 3D-Lazy-Load sind alle implementiert (siehe Git-Log + mageknight-web-game-development Skill). Die Tasks unten sind historisch; kein offener Phase-1-Backlog mehr.*

### 1.1 Cinematic Rendering Pipeline
| Task | Aufwand | Details |
|------|---------|---------|
| WebGL2/Three.js Shader Pipeline | 3 Wochen | Custom Shaders für Hexes (Normal Maps, Specular, Parallax), Post-Processing (Bloom, DOF, Color Grading) |
| Particle System v2 | 2 Wochen | GPU-Particles (Compute Shader), Spell Effects, Combat Impacts, Ambient (Dust, Magic) |
| Sprite Animation System | 1 Woche | Atlas-based, Frame-blending, Character/Enemy Idle/Attack/Death |
| Dynamic Lighting | 1 Woche | Day/Night Cycle mit Echtzeit-Schatten, Mana-Glow, Spell-Lights |

### 1.2 Asset Pipeline & Content
| Task | Aufwand | Details |
|------|---------|---------|
| Professional Art Pack | 4 Wochen | Karten-Illustrationen (AI-assisted + Human Polish), Enemy Sprites, Hero Portraits, Site Art, UI Icons |
| Sound Design | 2 Wochen | Adaptive Soundtrack (Layered Stems), 50+ SFX, Spatial Audio (Web Audio API) |
| Font/Typography Polish | 3 Tage | Variable Fonts, Kerning, RTL-Support für Loc |

### 1.3 Animation & Juice
- [ ] **12 Principles of Animation** auf alle Interaktionen anwenden
- [ ] **Hit Pause / Screen Shake / Hit Flash** bei Combat
- [ ] **Anticipation/Follow-through** bei Card Play, Movement, Level Up
- [ ] **Staggered Entrances** für UI Panels, Modals, Hand Cards

---

## 🧠 Phase 2: Rules Completeness & AI (Woche 9-16)

### 2.1 Missing Rules Implementation
| Feature | Status | Aufwand |
|---------|--------|---------|
| **Poison (vollständig)** | ✅ Done | — |
| **Assassinate (Unit Assignment)** | ✅ Done | — |
| **Spawning Grounds** | ✅ Done | — |
| **Mazes/Labyrinths** | ✅ Done | — |
| **Dungeon/Tomb/Ruin Rewards** | ✅ Done | — |
| **Coop Rules (2-Player)** | ❌ Missing | 3 Wochen |
| **Advanced Actions (alle 24)** | ✅ 24/24 | — |
| **Spells (alle 16)** | ✅ 16/16 | — |
| **Units (alle 8 Typen)** | ✅ 11/11 | — |

### 2.2 AI Upgrade: From Scripted → Intelligent
| Meilenstein | Ansatz | Aufwand |
|-------------|--------|---------|
| **MCTS Baseline** | Monte Carlo Tree Search im Worker | 2 Wochen |
| **Evaluation Network** | Klein, CNN für Board State → Value/Policy | 3 Wochen |
| **Difficulty Scaling** | MCTS Iterations + Net Strength + Heuristics | 1 Woche |
| **AI Personalities** | Aggressive/Defensive/Opportunist via Weight Mods | 3 Tage |
| **Async Inference** | WASM/ONNX Runtime im Worker | 1 Woche |

### 2.3 Scenarios & Campaign
- [ ] **4 Standard Szenarien** implementieren (Mines, Druids, Dungeons, Conquest)
- [ ] **Campaign Mode**: Verbundene Szenarien mit Persistenz (Level/XP/Artefakte tragen über)
- [ ] **Scenario Editor** (JSON-basiert, für Community Content)

---

## ♿ Phase3: Accessibility & Polish (Woche 17-24) — Solo-Fokus

*Multiplayer (Hotseat/Async/Social) bewusst gestrichen — kein Interesse, reine Solo-Experience (AGENTS.md: "NO MULTIPLAYER").*

### 3.1 WCAG 2.1 AA Compliance
| Kriterium | Implementierung |
|-----------|-----------------|
| **Keyboard Navigation** | Vollständig (Tab Order, Focus Visible, Skip Links) |
| **Screen Reader** | ARIA Live Regions, Labels, Descriptions, Roles |
| **Color Blind** | 4 Palettes (Protanopia, Deuteranopia, Tritanopia, Monochrome) |
| **High Contrast** | System-Media-Query + Manual Toggle |
| **Reduced Motion** | Bereits implementiert, verfeinern |
| **Text Scaling** | REM-basiert, bis 200% ohne Horizontal Scroll |
| **Language** | i18n Framework erweitern (EN, DE, FR, ES, CN, JP) |

### 3.2 Input Remapping & Customization
- [ ] **Full Key Remapping** (Gamepad + Keyboard)
- [ ] **Gamepad Support** (Standard Layout, Steam Input API)
- [ ] **Touch Gesture Customization**
- [ ] **UI Scale Slider** (0.8x - 1.5x)

### 3.3 Polish & QOL
- [ ] **Tutorial Overhaul**: Interactive, Contextual, Skippable, Progress Tracker
- [ ] **In-Game Wiki/Codex**: Rules, Cards, Enemies, Searchable
- [ ] **Replay System**: Full Game Replay, Export (Video/GIF), Share Link
- [ ] **Statistics Dashboard**: Deep Dive (Heatmaps, Win Rates, Card Efficiency)

---

## 📦 Phase4: Platform & Distribution (Woche 31-38)

### 4.1 PWA & Offline-First
- [ ] **Service Worker**: Precaching, Runtime Caching, Background Sync
- [ ] **IndexedDB**: Saves, Assets, Replays (Quota Management)
- [ ] **Install Prompt**: Custom, Timing-optimiert
- [ ] **App Shortcuts**: New Game, Continue, Daily Run

### 4.2 Desktop App (Tauri v2)
- [ ] **Rust Backend**: Native File Dialogs, Tray, Auto-Updater
- [ ] **System Integration**: Native Notifications, Protocol Handler (`mageknight://`)
- [ ] **Performance**: WASM für Hot Paths (Pathfinding, Combat Math)
- [ ] **Steam Deck / Console**: Controller UI, 720p/1080p UI Scaling

### 4.3 CI/CD & Release Automation
- [ ] **Multi-Platform Builds**: Web, Windows, macOS, Linux, Android (Capacitor)
- [ ] **Automated Playtesting**: Headless Bots laufen Daily Runs
- [ ] **Visual Regression**: Percy/Chromatic für UI
- [ ] **Performance Budgets**: Bundle Size, FPS, Memory, Load Time

---

## 🔄 Phase5: LiveOps & Longevity (Woche 39-52+)

### 5.1 Content Pipeline
- [ ] **Modding API**: Data-Driven (Cards, Enemies, Scenarios via JSON/Schema)
- [ ] **Steam Workshop / Mod.io Integration**
- [ ] **Seasonal Content**: Quarterly Updates (New Hero, Scenario, Mechanics)
- [ ] **Community Challenges**: Weekly Seeds, Community Goals

### 5.2 Analytics & Balancing
- [ ] **Telemetry** (Opt-in, Privacy-First): Funnel, Drop-off, Win Rates, Card Pick Rates
- [ ] **A/B Test Framework**: Balance Changes, UI Variants
- [ ] **Auto-Balancing**: ML-gestützte Card/Enemy Stat Anpassung

### 5.3 Monetization (Optional, Ethical)
- [ ] **Cosmetics Only**: Card Backs, Board Skins, Hero Portraits, Particle Effects
- [ ] **No Pay-to-Win**: Alle Gameplay-Inhalte Free
- [ ] **Supporter Pack**: Name in Credits, Exclusive Cosmetic, Early Access

---

## 📋 Quick Wins (Sofort umsetzbar, < 1 Woche each)

| # | Quick Win | Impact |
|---|-----------|--------|
| 1 | **Combat Log v2**: Farbkodiert, Filterbar, Expandable Details | High |
| 2 | **Card Tooltips on Hover**: Full Text, Keywords, Mana Cost | High |
| 3 | **Enemy Tooltips**: Abilities, Resistances, Armor, Attack | High |
| 4 | **Terrain Tooltips**: Movement Cost, Special Rules | Med |
| 5 | **Undo Stack Visualisierung**: Letzte 5 Aktionen als Icons | Med |
| 6 | **Mana Prediction**: "Wenn ich diesen Würfel nehme, kann ich X spielen" | High |
| 7 | **Auto-Save**: Alle 30s + vor kritischen Aktionen | High |
| 8 | **Settings: Animation Speed** (0.5x - 2x) | Low |
| 9 | **Settings: Auto-End Turn Confirmation** | Low |
| 10 | **Mobile: Haptic Feedback** (Vibration API) | Med |

---

## 🎯 Milestones & Success Metrics (angepasst, Stand 2026-07-15)

| Meilenstein | Success Criteria |
|-------------|------------------|
| **M1: Visual AAA** ✅ | 3D-Pipeline, Particles, Sprite-Anim, Dynamic Lighting, Adaptive Music/SFX, 13 Artefakte, Touch-Controller |
| **M2: Rules Complete** ⚠️ ~99% | 24/24 Actions, 16/16 Spells, 11 Unit-Typen, 8 Szenarien, 10 Site-Handler, 20 Feinde, 4 Skill-Gruppen; Lücke: `spell_effect` (Spell Mastery) |
| **M3: AI 2.0** | MCTS schlägt 80% der Spieler auf "Normal" |
| **M4: Accessibility Audit** | Externes Audit: WCAG 2.1 AA Pass |
| **M5: Desktop Release** | Tauri App, < 1% Crash Rate |

*Multiplayer-Meilenstein (M4 alt) gestrichen — Solo-Fokus.*

---

## 🚀 Next Steps (diese Woche)

1. **Spell Mastery schließen**: `spell_effect` ist der letzte unimplementierte Effekt-Typ (`UNHANDLED_EFFECT_LABELS`). Card-Choice-Flow für „beliebigen Zauber wirken" analog zu `wish`/`copy_card` ergänzen (Hero-Methode + UI-Default + Tests).
2. **Accessibility**: Colorblind-Paletten, Screenreader-Live-Regions, Full Key-Remapping (WCAG 2.1 AA).
3. **Performance-Budget**: Bundle-Size + FPS + Load-Time messen und in CI als Budget-Gate (Phase4.3).

---

*Dieses Dokument ist lebendig. Update nach jedem Meilenstein.*