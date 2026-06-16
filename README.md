# Mage Knight - Base Game

[![Build Status](https://img.shields.io/github/actions/workflow/status/bumblei3/mageknight/ci.yml?branch=master&label=build&logo=github)](https://github.com/bumblei3/mageknight/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/codecov/c/github/bumblei3/mageknight?logo=codecov)](https://codecov.io/gh/bumblei3/mageknight)
![Tests: 2506 passing](https://img.shields.io/badge/tests-2506%20passing-brightgreen)

Eine vereinfachte, spielbare Web-Version des Mage Knight Brettspiels.

## 🎮 Über das Spiel

Dies ist eine Basis-Version von Mage Knight, implementiert als Web-Anwendung. Das Spiel bietet die Kern-Mechaniken des Originals in vereinfachter Form:

- **Solo-Modus**: Spiele als Held Goldyx gegen KI-gesteuerte Feinde
- **Hex-basiertes Spielfeld**: Bewege dich über verschiedene Terraintypen
- **Kartenbasiertes Gameplay**: Nutze Aktionskarten für Bewegung, Angriff und Verteidigung
- **Taktischer Kampf**: Bekämpfe Feinde in einem vereinfachten Kampfsystem
- **Ressourcen-Management**: Verwalte Mana, Ruhm und Verletzungen
- **Speichern & Laden**: Speichere deinen Fortschritt in mehreren Slots

## 🚀 Spielstart

1. Öffne `index.html` in einem modernen Webbrowser
2. Das Spiel startet automatisch
3. Du beginnst mit 5 Handkarten und Goldyx auf Position (0,0)

## 📚 Dokumentation & Updates

### Aktuelle Updates
- **[Graphics Upgrade](GRAPHICS_UPGRADE.md)**: Details zum neuen Premium-Look, 3D-Effekten und Animationen.
- **[UI Improvements](UI_IMPROVEMENTS.md)**: Keyboard Shortcuts, neue Indikatoren und UX-Verbesserungen.

### Regeln & Entwicklung
- **[Regeln & Status](rules.md)**: Detaillierte Übersicht der implementierten Regeln, Feindfähigkeiten und fehlenden Features.
- **[Test Guide](TEST_WRITING_GUIDE.md)**: Anleitung zum Schreiben von Tests für dieses Projekt.
- **[Hilfe System](HELP_SYSTEM.md)**: Dokumentation des Hilfesystems.

## 📖 Spielanleitung

### Grundlagen

**Ziel**: Besiege alle Feinde auf der Karte!

**Dein Held**:
- **Rüstung**: Reduziert erhaltenen Schaden
- **Handlimit**: Maximale Anzahl Karten auf der Hand
- **Verletzungen**: Blockieren Kartenslots

### Spielablauf

1. **Karten spielen**:
   - **Linksklick** auf Karte: Spielt die Basis-Wirkung
   - **Rechtsklick** auf Karte: Öffnet Modal für seitliches Spielen (+1 Bewegung/Angriff/Block/Einfluss)

2. **Bewegung**:
   - Spiele Bewegungskarten (grüne Karten)
   - Klicke auf ein hervorgehobenes Hex, um dorthin zu ziehen
   - Unterschiedliche Terrains kosten unterschiedlich viel Bewegungspunkte

3. **Kampf**:
   - Betritt ein Feld mit einem Feind, um den Kampf zu beginnen
   - **Block-Phase**: Spiele Block-Karten (blaue Karten), um Feindangriffe zu blockieren
   - **Schadens-Phase**: Automatisch - du erhältst Verletzungen für ungeblockten Schaden
   - **Angriffs-Phase**: Spiele Angriffs-Karten (rote Karten), um Feinde zu besiegen
   
4. **Zug beenden**:
   - Klicke auf "Zug beenden"
   - Gespielte Karten gehen auf den Ablagestapel
   - Ziehe neue Karten bis zum Handlimit

### Kartentypen

- 🌿 **Grüne Karten**: Bewegung
- ⚔️ **Rote Karten**: Angriff
- 🛡️ **Blaue Karten**: Block/Verteidigung
- 💬 **Weiße Karten**: Einfluss (in Basis-Version eingeschränkt)

### Terraintypen

- 🌾 **Ebenen**: 2 Bewegungspunkte
- 🌲 **Wald**: 3 Bewegungspunkte (Tag), 5 (Nacht)
- ⛰️ **Hügel**: 3 Bewegungspunkte
- 🏔️ **Berge**: 5 Bewegungspunkte
- 🏜️ **Wüste**: 5 Bewegungspunkte (Tag), 3 (Nacht)
- ☠️ **Ödland**: 3 Bewegungspunkte
- 💧 **Wasser**: Unpassierbar

### Feinde

- 🗡️ **Schwächling**: Rüstung 2, Angriff 1
- 👹 **Ork**: Rüstung 3, Angriff 2
- 🛡️ **Wächter**: Rüstung 4, Angriff 3 (befestigt)
- 👻 **Phantom**: Rüstung 2, Angriff 3, **Attentäter** (Schaden muss vom Helden genommen werden)
- 🦇 **Vampir**: Rüstung 4, Angriff 4, **Attentäter**, Vampirismus, Giftig
- 🐲 **Drache**: Rüstung 6, Angriff 5, Brutal, Feuer-Resistenz

*(Siehe [rules.md](rules.md) für Details zu Feindfähigkeiten wie Vampirismus, Flink, etc.)*

### Mana-System

- Klicke auf Mana-Würfel in der Quelle, um sie zu nehmen
- Farben: 🔥 Rot, 💧 Blau, ✨ Weiß, 🌿 Grün, 💰 Gold, 🌑 Schwarz
- **Tag/Nacht-Regel**: Gold-Mana ist ein Wildcard (beliebige Farbe), aber **nur am Tag**. In der Nacht kann Gold-Mana nicht verwendet werden, um andere Farben zu ersetzen.
- Mana wird für starke Kartenwirkungen benötigt.

## 🎯 Tipps & Strategie

1. **Plane voraus**: Überlege, welche Karten du für Bewegung und welche für Kampf brauchst
2. **Vermeide Verletzungen**: Blocke starke Feindangriffe, wenn möglich
3. **Nutze das Terrain**: Manchmal ist der längere Weg über Ebenen besser als der kurze durch Berge
4. **Karten seitlich spielen**: Wenn du nur +1 brauchst, spare die starken Effekte für später
5. **Raste mit Bedacht**: Lege unerwünschte Karten ab, um bessere Karten nachzuziehen
6. **Fehler machen erlaubt**: Nutze den Undo-Button (↩️) oder Strg+Z, um Bewegungs- oder Manafehler zu korrigieren.

## 🛠️ Technische Details

### Architektur

Das Spiel ist modular aufgebaut:

- `js/game.ts` - Haupt-Spiellogik und Controller
- `js/hexgrid.ts` - Hex-Grid-System mit axialen Koordinaten
- `js/hero.ts` - Helden-Klasse mit Stats und Deck-Management
- `js/card.ts` - Kartensystem und Karten-Definitionen
- `js/enemy.ts` - Feind-System
- `js/enemyAI.ts` - KI-gesteuerte Feind-Entscheidungen (Web Worker)
- `js/combat.ts` - Kampf-Mechanik
- `js/mana.ts` - Mana-Quelle und Kristall-Verwaltung
- `js/persistence/SaveManager.ts` - Robustes Speichersystem (Zod Schema + Migration)
- `js/persistence/SaveSchema.ts` - Zod Schemas & Migration für Save/Load
- `js/statistics.js` - Performance- und Spielstatistiken
- `js/terrain.ts` - Terrain-Definitionen
- `js/ui.ts` - UI-Rendering und Interaktion
- `js/particles.js` - Leistungsstarkes Partikelsystem
- `js/skills.js` - Fähigkeiten-System
- `js/tutorialManager.js` - Erweitertes Tutorial-System
- `js/combat/CombatPredictor.ts` - Kampf-Vorhersage-System
- `js/combat/CombatUnitManager.ts` - Elementare Unit-Angriffe/Blöcke
- `js/game/CombatOrchestrator.ts` - Combat UI Orchestrierung
- `js/game/GameStateManager.ts` - Save/Load State Management
- `js/workers/aiWorker.js` - Web Worker für KI-Pfadfindung

### Technologie-Stack

- **HTML5** - Struktur
- **Vanilla CSS** - Styling mit CSS-Variablen
- **JavaScript ES6+** - Spiellogik mit Modulen
- **Canvas API** - Hex-Grid-Rendering
- **Three.js** - 3D-Ansicht (lazy-loaded, ~514KB)
- **TypeScript** - Typsichere Entwicklung
- **Vite** - Build-Tool mit Chunk-Splitting
- **Vitest** - Unit/Integration Tests
- **Playwright** - E2E Tests

## 🧪 Testing

Das Projekt verfügt über eine hochmoderne Test-Suite mit **2506 Tests**.

```bash
# Alle Tests ausführen
npm test

# Tests mit Coverage
npm run test:coverage

# E2E Tests
npm run test:e2e

# Linting
npm run lint

# Typecheck
npm run typecheck

# Production Build
npm run build
```

## 📜 Lizenz

Dies ist ein Fan-Projekt basierend auf dem Mage Knight Brettspiel von WizKids.
Nur für Lern- und Demonstrationszwecke.

## 🙏 Credits

- Original Mage Knight Brettspiel: Vlaada Chvátil, WizKids
- Hex-Grid-Mathematik: [Red Blob Games](https://www.redblobgames.com/grids/hexagons/)