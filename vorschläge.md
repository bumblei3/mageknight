# Verbesserungsvorschläge für Mage Knight Das Brettspiel (Digital)

Basierend auf der Analyse des offiziellen Regelwerks (`mageknight_ultimate.txt`) und dem aktuellen Stand der Codebasis, wurden folgende Verbesserungsvorschläge identifiziert, um die Regeltreue, Spieltiefe und Benutzererfahrung zu optimieren.

## 1. Korrektur & Erweiterung von Feindfähigkeiten (Priorität: Hoch)
Die Simulation komplexer Feindeigenschaften ist derzeit unvollständig. Um die taktische Tiefe des Originals zu erreichen, müssen folgende Fähigkeiten angepasst werden:

*   **Vampirismus (Vampirismus)** 🩸
    *   *Aktuell:* Feind heilt sich bei Schaden.
    *   *Regel:* Der Rüstungswert des Feindes **erhöht sich** permanent für den Rest des Kampfes für jede zugefügte Wunde (an Einheit oder Held).
    *   *Maßnahme:* `armorBonus`-Logik implementieren, die bei `takeWound` inkrementiert wird.

*   **Versteinern (Paralyze)** 🗿
    *   *Aktuell:* Nicht implementiert.
    *   *Regel:* Verwundete Einheiten werden **sofort zerstört**. Der Held muss für jede Wunde **Nicht-Verletzungskarten abwerfen**.
    *   *Maßnahme:* Spezielle Schadenszuweisungslogik ("Destroy" statt "Wound") und Handkarten-Discard-Trigger hinzufügen.

*   **Schwerfällig (Cumbersome)** 🐢
    *   *Aktuell:* Nicht implementiert.
    *   *Regel:* Spieler können **Bewegungspunkte** ausgeben, um den Angriffswert in der Blockphase zu reduzieren.
    *   *Maßnahme:* `Combat UI` erweitern, um Bewegungspunkte als Ressource im Block-Schritt anzubieten.

*   **Herbeirufen (Summon)** 🔮
    *   *Aktuell:* Nur für Bosse.
    *   *Regel:* Normale Beschwörer-Feinde werden im Kampf durch ein zufälliges braunes Plättchen **ersetzt**.
    *   *Maßnahme:* Logik für Token-Austausch zu Kampfbeginn hinzufügen.

*   **Attentäter (Assassinate)** 🗡️
    *   *Aktuell:* Keine Einschränkung.
    *   *Regel:* Schaden darf **nicht auf Einheiten** gelegt werden. Muss vom Helden genommen werden.
    *   *Maßnahme:* Verletzungszuweisung im UI für Einheiten sperren, wenn Feind "Attentäter" ist.

*   **Ausweichend (Elusive)** 💨
    *   *Aktuell:* Statische Rüstung.
    *   *Regel:* Rüstung ist im Fernkampf/Blockphase hoch. Sinkt nur in der Angriffsphase, wenn der Feind **vollständig geblockt** wurde.
    *   *Maßnahme:* Dynamische Rüstungsberechnung `getArmor(phase, isBlocked)` implementieren.

## 2. Gameplay & Szenarien (Priorität: Mittel)

*   **Neue Szenarien:**
    *   Implementierung von **"Freiheit den Bergwerken"**: Fokus auf Kampf in Minen (Licht/Dunkelheit-Mechanik beachten!).
    *   Implementierung von **"Druidennächte"**: Einführung von "Magischen Lichtungen" und Beschwörungsmechaniken.

*   **Erweiterte Orte:**
    *   Vollständige Implementierung von **Dungeons, Grabstätten und Ruinen** mit korrekten Belohnungsregeln (Artefakte, Zauber).
    *   **Labyrinthe** und **Spawning Grounds** (Brutstätten) hinzufügen.

## 3. UI/UX Verbesserungen (Priorität: Mittel)

*   **Erweitertes Kampf-Log:** Detailliertere Aufschlüsselung von Widerständen und Block-Effizienz im Log (z.B. "Eis-Block halbiert gegen Feuer-Angriff").
*   **Interaktive Regel-Tooltips:** Mouseover über Feindfähigkeiten-Icons (z.B. "Brutal") sollte den exakten Regeltext anzeigen.
*   **Rückgängig-Funktion (Undo):** Erlauben, Aktionen innerhalb einer Phase (z.B. Karte spielen) zurückzunehmen, solange keine neuen Informationen (Würfelwurf, Plättchen aufdecken) enthüllt wurden.

## 4. Technische Optimierungen

*   **Refactoring `Combat.js`:** Aufsplitten der riesigen `Combat`-Klasse in kleinere Module (`CombatCalculator`, `CombatTurnManager`, `DamageAssigner`).
*   **Testabdeckung:** Erstellen von spezifischen Tests für jede der oben genannten Feindfähigkeiten, um Regeltreue sicherzustellen.

---
*Erstellt am: 02.01.2026*
