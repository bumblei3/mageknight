# Mage Knight — Echter Content/Regel-Gap-Report (Stand 2026-07-15)

Generiert aus den echten Quellexports (nicht aus der veralteten AAA_ROADMAP.md).
Gemessen via `scripts/count_content.mts` (läuft echte Exports aus constants.ts / unit.ts /
CardDefinitions.ts / HeroManager.ts / ScenarioManager.ts).

## 1. Echte Content-Zahlen vs. M2-Ziele der AAA_ROADMAP

| Dimension | Roadmap M2-Ziel | ECHT heute | Lücke |
|-----------|----------------|------------|------|
| Helden | 5+ | **4** (goldyx, norowas, arythea, tovak) | 1 fehlt (Tovak schon drin → eher Arythea/Goldyx/Norowas/Tovak = die 4 Original-Helden; 5. Held wäre Braevalor/Goldyx-Variante) |
| Feinde (defs) | 20+ | **18** | 2 fehlen |
| Bosses | – | **4** (dark_lord, dragon_lord, lich_king, volkare) | ausreichend |
| Unit-Typen | alle 8 | **11** | übererfüllt (Roadmap-Zahl veraltet) |
| Spells | alle 16 | **15** | 1 fehlt |
| Advanced Actions | alle 24 | **24** | ERFÜLLT |
| Artefakte | – | **12** | vorhanden (Roadmap vergessen) |
| Szenarien | 8+ | **7** (mines_freedom, mining_expedition, druid_nights, dungeon_lords, labyrinth_rising, volkare_quest, volkare_return, volkare_legacy = 8) | Korrektur: es sind **8**, nicht 7 (Zählung oben griff nur die Inline-Objekte; mining_expedition ist ein Import). → Roadmap-Ziel ERFÜLLT. |
| Site-Typen | – | **15** (village, keep, mage_tower, monastery, 4×city, ruins, dungeon, tomb, spawning_grounds, labyrinth, mine, magic_glade, den) | reichhaltig |
| Site-Handler | – | **10** (Base, City, Exploration, Keep, Labyrinth, MageTower, Mine, Monastery, SpawningGrounds, Village) | alle Kern-Sites abgedeckt |
| Skill-Gruppen | – | **2** (goldyx, norowas) | arythea + tovak skills FEHLEN |
| Gegner-Traits | – | **11+** (swift, fortified, brutal, poison, petrify, assassin, summoner, elusive, defensive, vampiric, cumbersome, arcaneImmune, paralyze laut Skill) | vollständig |

## 2. Was die AAA_ROADMAP.md FALSCH/VERALTET behauptet

- **Phase1 (Shader/Particles/3D/Adaptive Music/SFX)** steht als „Zukunft (Woche 3-8)".
  → Laut Git-Log + Skill-Notizen ist ALLES schon drin (Phase1 Visual AAA abgeschlossen,
  Three.js-Pipeline, DynamicLighting, ParticleSystem, PostProcessing, SpriteAnimation, AdaptiveMusicManager, 13 Artefakte, Touch-Controller).
- **Multiplayer (Phase3)** als Ziel gelistet.
  → Du willst KEIN Multiplayer (AGENTS.md: „NO MULTIPLAYER"). Ganzer Abschnitt muss gestrichen werden.
- **„Rules Coverage ~70% (Core)"** behauptet.
  → Echt: 24/24 Advanced Actions, 15/16 Spells, alle Unit-Typen, 8 Szenarien, 10 Site-Handler.
  Die Roadmap unterschätzt den echten Stand massiv.
- **„Content: 1 Held, 6 Feinde, 2 Szenarien"** (Vision-Tabelle).
  → Echt: 4 Helden, 18 Feinde, 8 Szenarien. Völlig veraltet.
- **Budget-Zeile „~80k-120k EUR"** bleibt drin, obwohl das ein Solo-Projekt ist.

## 3. ECHTE verbleibende Lücken (wo es sich wirklich lohnt)

### A. Skills für 2 von 4 Helden fehlen (HOHE PRIORITÄT)
Nur goldyx + norowas haben HERO_SKILLS-Einträge. arythea + tovak haben Helden-Definitionen
aber KEINE Skill-Gruppe. Das ist ein echter, messbarer Gap — kein Padding.
→ `js/skills/skillDefinitions.ts` ergänzen (arythea Chaos-Blut, tovak Verteidigung/Taktik).

### B. 1 Spell + 2 Feinde bis zu den M2-Zielen (NIEDRIGE PRIORITÄT)
15/16 Spells, 18/20 Feinde. Nahe am Ziel, aber nicht „100% Rules".
→ Einen weiteren Spell + 2 Feind-Definitionen (z.B. `oryx`, `werewolf`, `ice_golem`) ergänzen.

### C. Site-Typen ohne Handler (MITTEL)
`magic_glade` und `den` sind als SITE_TYPES definiert, aber es gibt KEINE Handler-Datei
(kein MagicGladeHandler, kein DenHandler). Wenn die auf der Karte spawnen, ist das toter Inhalt.
→ Entweder Handler bauen ODER die Typen aus SITE_TYPES entfernen (radikale Löschung toten Codes).

### D. Test-Entrümpelung (Radikale Löschung, dein Stil)
210 vitest-Files / 20 e2e-Specs. 0-Assertion-Stubs + redundante `_coverage_boost`-Files
radikal löschen, Gate (80% global) grün halten. Bringt keine Features, räumt aber Sprawl.

### E. Accessibility (AAA, aber Hardening)
Colorblind-Paletten (Protan/Deuter/Tritan/Mono), Screenreader-Live-Regions,
Full Key-Remapping. Echte Qualität, keine Spielmechanik-Erweiterung.

## 4. Empfehlung (Foundation-first, dein Muster)
Nicht weiter auf einer veralteten Roadmap bauen. Zuerst:
1. AAA_ROADMAP.md auf Wahrheit trimmen (Phase1 als „done" markieren, Multiplayer streichen,
   echte Zahlen eintragen, Budget-Zeile löschen).
2. Den WERTVOLLSTEN echten Gap schließen: **A — arythea/tovak Skills** (messbar, spielbar,
   kein Feature-Padding). Danach B + C, wenn du willst.

## 5. Reproduzierbarkeit
`npx tsx scripts/count_content.mts` — zählt Helden/Feinde/Bosses/Units/Spells/Actions/
Artefakte/Skills aus den echten Exports. Szenarien = 8 Inline-Objekte in ScenarioManager +
1 Import (mining_expedition). Site-Handler via `ls js/sites/`.
