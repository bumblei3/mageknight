# Mage Knight - Rules & Implementation Status

This document serves as a reference for the official game rules (based on *Mage Knight Ultimate Edition*) and tracks their current implementation status in the codebase.

## 1. Enemy Abilities (Feindplättchen-Eigenschaften)

| Ability | German | Rule Summary | Current Implementation Status |
| :--- | :--- | :--- | :--- |
| **Fire Attack** | *Feuer-Angriff* | Only Ice/Cold Fire blocks are full; others halved. | ✅ Implemented `COMBAT.getResistanceMultiplier` |
| **Ice Attack** | *Eis-Angriff* | Only Fire/Cold Fire blocks are full; others halved. | ✅ Implemented |
| **Cold Fire Attack** | *Kaltes-Feuer-Angriff* | Only Cold Fire blocks are full; others halved. | ✅ Implemented |
| **Physical Resistance** | *Physischer Widerstand* | Physical attacks are halved. | ✅ Implemented |
| **Fire Resistance** | *Feuer-Widerstand* | Fire attacks are halved. | ✅ Implemented |
| **Ice Resistance** | *Eis-Widerstand* | Ice attacks are halved. | ✅ Implemented |
| **Summon** | *Herbeirufen* | Draws a brown enemy token to **replace** the summoner in Block/Damage phase. Discarded after. | ✅ **Implemented** (Replaces Summoner with random token) |
| **Swift** | *Flink* | Requires **2x Block** value. | ✅ Implemented `getBlockRequirement` |
| **Brutal** | *Brutal* | Deals **2x Damage** if unblocked. | ✅ Implemented `getEffectiveAttack` |
| **Poison** | *Giftig* | Wounded units/heroes take **2 Wounds** (one to hand, one to discard) or units destroyed. | ⚠️ **Partial** (Basic poison check exists, explicitly double wounding needs verification) |
| **Vampirism** | *Vampirismus* | Armor increases by +1 per wound dealt. | ✅ **Verified** (Correctly increases armor on wounds) |
| **Paralyze** | *Versteinern* | Destroy wounded unit instantly. Hero must discard non-wound cards for wounds taken. | ✅ **Implemented** (Auto-discard logic active) |
| **Cumbersome** | *Schwerfällig* | Can spend Movement Points to reduce attack value in Block phase. | ✅ **Implemented** (Smart Auto-Spend UI) |
| **Assassinate** | *Attentäter* | Damage **cannot** be assigned to Units. Must hit Hero. | ⚠️ **Partial** (Effectively active due to missing Unit Assignment) |
| **Elusive** | *Ausweichend* | Higher base armor. Armor drops only in Attack phase AND if fully blocked. | ✅ **Verified** (Correctly handles dynamic armor) |
| **Fortified** | *Befestigt* | Immune to Ranged (unless Siege) in Ranged Phase. | ✅ Implemented |

## 2. Combat Rules

### Block Phase
*   **Cold Fire Block**: Acts as ANY element (Fire, Ice, Physical) for blocking purposes.
*   **Efficiency**: Wrong element blocks are halved (rounded down).
*   **Unit Blocks**: Units contribute to block.
    *   *Implementation Note*: Currently unit blocks are generic physical. Need to support elemental unit blocks.

### Damage Phase
*   **Assignment**: Damage is assigned to Units or Hero.
*   **Resistances**: If a Unit has resistance to the attack element, damage is reduced by Armor value (unit takes no wound), leftover spills over.
    *   *Implementation Note*: Basic resistance logic exists, but complex "spillover" reduction needs robust testing.

### Attack Phase
*   **Phase Restrictions**: Ranged/Siege attacks used in Ranged phase cannot be used again here unless specified.
*   **Grouping**: You can group multiple enemies if you can defeat them all at once.
    *   *Implementation Note*: Basic grouping exists, needs verification for edge cases.

## 3. Scenarios

### Implemented
*   **Full Conquest (Vollständige Eroberung)**: Capture all cities.
*   **Quick Start (Erste Erkundung)**: Simplified introductory scenario.

### Planned
*   **Mines Liberation (Freiheit den Bergwerken)**: Conquer mines. (Concept: Light/Darkness mechanics in mines)
*   **Druid Nights (Druidennächte)**: Activate magical glades. (Concept: Summoning mechanics)
*   **Dungeon Lords**: Conquer Dungeons, Tombs, and Ruins.

## 4. Map & Movement

*   **Terrain Costs**: Day/Night differences for Forests/Deserts.
    *   ✅ Implemented
*   **Rampaging Enemies**: Provoke attacks when moving adjacent.
    *   ✅ Implemented in `MapManager` / `InteractionController`.
*   **Sites**:
    *   *Villages*: Heal, Recruit. (✅ Implemented)
    *   *Monasteries*: Train Advanced Actions. (✅ Implemented + **Artifact Reward**)
    *   *Mage Towers*: Recruit Spells. (✅ Implemented + **Artifact Reward after Conquest**)
    *   *Keeps*: Recruit Units. (✅ Implemented + **Artifact Reward after Conquest**)
    *   *Dungeons/Tombs/Ruins*: Adventure sites. (⚠️ Partial implementation - Reward rules needed)
    *   *Spawning Grounds*: Brutstätten. (❌ Missing)
    *   *Mazes/Labyrinths*: (❌ Missing)

## 5. UI/UX Suggestions (Planned)

*   **Combat Log**: More detailed breakdown of resistances and block efficiency.
*   **Interactive Tooltips**: Mouseover enemy icons for exact rules.
*   **Undo**: Allow taking back actions within a phase if no new info was revealed.

## 6. Artefakte (Gold Cards)

Artefakte sind spezielle Gold-Karten (=Artifacts), die permanent ausgerüstet werden können. Sie bieten passive Boni solange sie ausgerüstet sind.

| Artefakt | Typ | Basiseffekt | Verstärkter Effekt |
|----------|-----|-------------|-------------------|
| Banner of Glory | Influence | +3 Einfluss | +6 Einfluss |
| Soul Stealer | Attack | +4 Angriff (Vampirism) | +8 Angriff (Vampirism) |
| Crystal of Insight | Mana | +2 Mana Token | +4 Mana Token |
| Staff of Asar | Attack | +3 Angriff (Fire) | +6 Angriff (Fire) |
| Dragon Heart | Attack | +5 Angriff (Cold Fire) | +10 Angriff (Cold Fire) |
| Boots of Flight | Movement | +4 Bewegung | +8 Bewegung |
| Amulet of Protection | Block | +6 Block | +12 Block |
| Ring of Power | All | +2 Inf/Att/Block | +4 Inf/Att/Block |
| Banner of Fear | Influence | +5 Inf (Rep loss) | +10 Inf (Rep loss) |
| Circlet of Command | Command | +1 Command Limit | +2 Command Limit |
| Rune Sword | Attack | +4 Angriff (Ice) | +8 Angriff (Ice) |
| Horn of Valor | Hybrid | +4 Inf, +3 Att | +8 Inf, +6 Att |
| Banner of Glory | Influence | +3 Einfluss | +6 Einfluss |

### Spielmechanik
- **Ziehen**: Artefakte kommen in die Hand wie normale Karten
- **Ausrüsten**: Klick auf Artefakt in der Hand → ersetzt aktuelles Artefakt (altes kehrt in Hand zurück)
- **Effekte**: Passive Boni werden sofort angewendet (Attack, Block, Movement, Influence, Command)
- **Save/Load**: Ausgerüstetes Artefakt wird persistiert
- **Nur 1 Artefakt gleichzeitig**

### Artefakt Belohnungen (Site Handlers)
- **Mage Tower** (nach Eroberung): "Artefakt suchen" → zufälliges Artefakt in Discard
- **Monastery**: "Artefakt suchen" → zufälliges Artefakt in Discard (1x pro Spiel)
- **Keep** (nach Eroberung): "Artefakt suchen" → zufälliges Artefakt in Discard

---

*Last Updated: 2026-06-16*
