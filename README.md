# Mage Knight - Base Game

Eine vereinfachte, spielbare Web-Version des Mage Knight Brettspiels.

## 🎮 Über das Spiel

Dies ist eine Basis-Version von Mage Knight, implementiert als Web-Anwendung. Das Spiel bietet die Kern-Mechaniken des Originals in vereinfachter Form:

- **Solo-Modus**: Spiele als Held Goldyx gegen KI-gesteuerte Feinde
- **Hex-basiertes Spielfeld**: Bewege dich über verschiedene Terraintypen
- **Kartenbasiertes Gameplay**: Nutze Aktionskarten für Bewegung, Angriff und Verteidigung
- **Taktischer Kampf**: Bekämpfe Feinde in einem vereinfachten Kampfsystem
- **Ressourcen-Management**: Verwalte Mana, Ruhm und Verletzungen

## 🚀 Spielstart

1. Öffne `index.html` in einem modernen Webbrowser
2. Das Spiel startet automatisch
3. Du beginnst mit 5 Handkarten und Goldyx auf Position (0,0)

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
   - **Rechtsklick** auf Karte: Spielt die Karte seitlich (+1 Bewegung/Angriff/Block/Einfluss)

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
- 🌲 **Wald**: 3 Bewegungspunkte (Tag), 2 (Nacht)
- ⛰️ **Hügel**: 3 Bewegungspunkte
- 🏔️ **Berge**: 5 Bewegungspunkte
- 🏜️ **Wüste**: 3 Bewegungspunkte (Tag), 2 (Nacht)
- ☠️ **Ödland**: 3 Bewegungspunkte
- 💧 **Wasser**: Unpassierbar

### Feinde

- 🗡️ **Schwächling**: Rüstung 2, Angriff 1
- 👹 **Ork**: Rüstung 3, Angriff 2
- 🛡️ **Wächter**: Rüstung 4, Angriff 3 (befestigt)

### Mana-System

- Klicke auf Mana-Würfel in der Quelle, um sie zu nehmen
- Farben: 🔥 Rot, 💧 Blau, ✨ Weiß, 🌿 Grün
- Mana wird für starke Kartenwirkungen benötigt (in Basis-Version vereinfacht)

## 🎯 Tipps & Strategie

1. **Plane voraus**: Überlege, welche Karten du für Bewegung und welche für Kampf brauchst
2. **Vermeide Verletzungen**: Blocke starke Feindangriffe, wenn möglich
3. **Nutze das Terrain**: Manchmal ist der längere Weg über Ebenen besser als der kurze durch Berge
4. **Karten seitlich spielen**: Wenn du nur +1 brauchst, spare die starken Effekte für später
5. **Raste mit Bedacht**: Lege unerwünschte Karten ab, um bessere Karten nachzuziehen

## 🛠️ Technische Details

### Architektur

Das Spiel ist modular aufgebaut:

- `js/game.js` - Haupt-Spiellogik und Controller
- `js/hexgrid.js` - Hex-Grid-System mit axialen Koordinaten
- `js/hero.js` - Helden-Klasse mit Stats und Deck-Management
- `js/card.js` - Kartensystem und Karten-Definitionen
- `js/enemy.js` - Feind-System
- `js/combat.js` - Kampf-Mechanik
- `js/mana.js` - Mana-Quelle und Kristall-Verwaltung
- `js/terrain.js` - Terrain-Definitionen
- `js/ui.js` - UI-Rendering und Interaktion

### Technologie-Stack

- **HTML5** - Struktur
- **Vanilla CSS** - Styling mit CSS-Variablen
- **JavaScript ES6+** - Spiellogik mit Modulen
- **Canvas API** - Hex-Grid-Rendering

## 🎨 Features der Basis-Version

✅ **Implementiert**:
- Hex-basiertes Spielfeld
- Held mit Starter-Deck (16 Karten)
- Bewegungssystem mit Terrainkosten
- Kampfsystem (Block, Schaden, Angriff)
- Mana-Quelle mit Würfeln
- Verletzungen und Heilung
- Ruhm-Tracking
- Gegner-KI (Basis)

❌ **Nicht in Basis-Version**:
- Spielplan-Erkundung
- Level-Aufstieg
- Städte und Orte
- Fern-/Belagerungsangriffe
- Einheiten rekrutieren
- Fortgeschrittene Aktionen/Zauber
- Multiplayer
- Tag/Nacht-Zyklus

## 🔧 Entwicklung

### Lokaler Server

Für beste Ergebnisse, starte einen lokalen Webserver:

```bash
# Mit Python 3
python -m http.server 8000

# Mit Node.js (http-server)
npx http-server
```

Dann öffne `http://localhost:8000` im Browser.

### Browser-Kompatibilität

- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Benötigt ES6 Module-Unterstützung

## 📝 Bekannte Einschränkungen

- Mana-Verstärkung von Karten noch nicht voll implementiert
- Einige Feind-Fähigkeiten sind vereinfacht
- Keine Speicherfunktion
- KI ist deterministisch

## 🚧 Zukünftige Erweiterungen

Mögliche Features für zukünftige Versionen:
- Vollständiges Mana-System mit Verstärkung
- Spielplan-Erkundung
- Mehr Helden zur Auswahl
- Level-System
- Städte und Interaktion
- Speichern/Laden
- Verschiedene Szenarien

## 📜 Lizenz

Dieses ist ein Fan-Projekt basierend auf dem Mage Knight Brettspiel von WizKids.
Nur für Lern- und Demonstrationszwecke.

## 🙏 Credits

- Original Mage Knight Brettspiel: Vlaada Chvátil, WizKids
- Hex-Grid-Mathematik: [Red Blob Games](https://www.redblobgames.com/grids/hexagons/)
