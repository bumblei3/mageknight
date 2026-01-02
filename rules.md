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
| **Summon** | *Herbeirufen* | Draws a brown enemy token to **replace** the summoner in Block/Damage phase. Discarded after. | ❌ **Missing** (Currently only Boss summons implemented) |
| **Swift** | *Flink* | Requires **2x Block** value. | ✅ Implemented `getBlockRequirement` |
| **Brutal** | *Brutal* | Deals **2x Damage** if unblocked. | ✅ Implemented `getEffectiveAttack` |
| **Poison** | *Giftig* | Wounded units/heroes take **2 Wounds** (one to hand, one to discard) or units destroyed. | ⚠️ **Partial** (Basic poison check exists, explicitly double wounding needs verification) |
| **Vampirism** | *Vampirismus* | Armor increases by +1 per wound dealt. | ❌ **Incorrect** (Currently heals HP) |
| **Paralyze** | *Versteinern* | Destroy wounded unit instantly. Hero must discard non-wound cards for wounds taken. | ❌ **Missing** |
| **Cumbersome** | *Schwerfällig* | Can spend Movement Points to reduce attack value in Block phase. | ❌ **Missing** |
| **Assassinate** | *Attentäter* | Damage **cannot** be assigned to Units. Must hit Hero. | ❌ **Missing** |
| **Elusive** | *Ausweichend* | Higher base armor. Armor drops only in Attack phase AND if fully blocked. | ❌ **Incorrect** (Currently static armor) |
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

### Planned / Missing
*   **Mines Liberation (Freiheit den Bergwerken)**: Conquer mines.
*   **Druid Nights (Druidennächte)**: Activate magical glades.
*   **Dungeon Lords**: Conquer Dungeons and Tombs.

## 4. Map & Movement

*   **Terrain Costs**: Day/Night differences for Forests/Deserts.
    *   ✅ Implemented
*   **Rampaging Enemies**: Provoke attacks when moving adjacent.
    *   ✅ Implemented in `MapManager` / `InteractionController`.
*   **Sites**:
    *   *Villages*: Heal, Recruit. (✅ Implemented)
    *   *Monasteries*: Train Advanced Actions. (✅ Implemented)
    *   *Mage Towers*: Recruit Spells. (✅ Implemented)
    *   *Keeps*: Recruit Units. (✅ Implemented)
    *   *Dungeons/Tombs/Ruins*: Adventure sites. (⚠️ Partial implementation)

---

*Last Updated: 2026-01-02*
