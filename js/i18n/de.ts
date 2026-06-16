/**
 * German (de) Translation File for Mage Knight
 */

const de = {
    // Game Core
    game: {
        title: 'Mage Knight',
        welcome: 'Willkommen bei Mage Knight!',
        started: 'Spiel gestartet. Viel Erfolg!',
        round: 'Runde {round}: {time}',
        day: 'Tag',
        night: 'Nacht',
        victory: 'Sieg!',
        defeat: 'Niederlage!',
        gameOver: 'Spiel beendet',
        endTurnCombatBlocked: 'Beende erst den Kampf, bevor du den Zug beenden kannst!'
    },

    // UI Elements
    ui: {
        buttons: {
            endTurn: 'Zug beenden',
            endRound: 'Runde beenden',
            attack: 'Angreifen',
            block: 'Blocken',
            heal: 'Heilen',
            rest: 'Rasten',
            cancel: 'Abbrechen',
            confirm: 'Bestätigen',
            close: 'Schließen',
            settings: 'Einstellungen',
            newGame: 'Neues Spiel',
            save: 'Speichern',
            load: 'Laden',
            explore: 'Erkunden'
        },
        labels: {
            fame: 'Ruhm',
            reputation: 'Ansehen',
            armor: 'Rüstung',
            movement: 'Bewegung',
            handLimit: 'Handkarten',
            wounds: 'Wunden',
            crystals: 'Kristalle',
            units: 'Einheiten',
            skills: 'Fähigkeiten',
            round: 'Runde',
            hero: 'Held',
            actions: 'Aktionen',
            manaSource: 'Mana-Quelle',
            log: 'Protokoll',
            deckSize: 'Deck Größe',
            unlocked: '{count}/{total} Freigeschaltet ({percent}%)',
            victoryReward: 'Belohnung wählen!',
            artifactFound: 'Du hast einen uralten Schatz gefunden! Wähle ein Artefakt:',
            artifact: 'Artefakt',
            ready: 'Bereit',
            exhausted: 'Erschöpft',
            noUnits: 'Keine Einheiten',
            noSkills: 'Keine Skills'
        },
        stats: {
            gamesPlayed: 'Spiele gespielt',
            wins: 'Siege',
            losses: 'Niederlagen',
            enemiesDefeated: 'Feinde besiegt (Total)',
            highestLevel: 'Höchstes Level',
            perfectCombats: 'Perfekte Kämpfe'
        },
        hints: {
            end: '🏁 Kampf endet',
            movement: '👣 {points} Punkte - Klicke auf ein Feld',
            exploration: '🎴 Spiele Karten oder bewege dich (1-5)'
        },
        phases: {
            exploration: 'Erkundung',
            combat: 'Kampf',
            ranged: 'Fernkampf',
            block: 'Block-Phase',
            attack: 'Angriff-Phase',
            phase1: 'Phase 1',
            phase2: 'Phase 2',
            phase3: 'Phase 3',
            enraged: 'Wütend'
        },
        tooltips: {
            armor: {
                title: 'Rüstung',
                desc: 'Reduziert den Schaden, den du im Kampf erleidest.'
            },
            handLimit: {
                title: 'Handlimit',
                desc: 'Die maximale Anzahl an Karten, die du am Ende deines Zuges auf der Hand haben darfst.'
            },
            wounds: {
                title: 'Verletzungen',
                desc: 'Verletzungen blockieren deine Hand. Raste oder heile dich, um sie loszuwerden.'
            },
            fame: {
                title: 'Ruhm',
                desc: 'Erfahrungspunkte. Sammle Ruhm durch Kämpfe und Erkundung, um im Level aufzusteigen.'
            },
            reputation: {
                title: 'Ansehen',
                desc: 'Beeinflusst Interaktionen in Dörfern und Klöstern. Hohes Ansehen macht Rekrutierung günstiger.'
            },
            phase: {
                title: 'Aktuelle Phase',
                desc: 'Zeigt an, was du gerade tun kannst. Beachte den Hinweis darunter.'
            }
        },
        settings: {
            shortcuts: 'Tastaturkürzel',
            reset: 'Zurücksetzen'
        }
    },

    // Combat
    combat: {
        started: 'Kampf beginnt!',
        summoning: '{summoner} beschwört {summoned}!',
        victory: 'Feind besiegt!',
        wounded: 'Du wurdest verwundet!',
        blocked: 'Angriff geblockt!',
        damage: '{amount} Schaden zugefügt',
        fameGained: '+{amount} Ruhm erhalten',
        enemyDefeated: '{enemy} wurde besiegt!',
        phaseRanged: 'Fernkampf-Phase',
        phaseBlock: 'Block-Phase',
        phaseAttack: 'Angriffs-Phase',
        rangedAttack: '{enemy} erleidet {amount} Fernkampf-Schaden! ({current}/{max} HP)',
        bossDefeated: '🏆 {enemy} im Fernkampf besiegt! +{amount} Ruhm!',
        defeatedInCombat: '{enemy} im {type} besiegt!',
        fortifiedImmunity: '{enemy} ist befestigt und kann nur mit Belagerung angegriffen werden!',
        rangedWeak: 'Fernkampf zu schwach ({attack} vs {armor})',
        blockStarted: 'Block-Phase begonnen.',
        totalDamage: 'Gesamtschaden: {amount}',
        alreadyBlocked: 'Feind bereits geblockt',
        blockSuccess: '{enemy} erfolgreich geblockt! {note}',
        blockInefficient: '(Ineffizienter Block!)',
        blockWeak: 'Block zu schwach ({attack} vs {armor}){note}',
        weakInefficient: ' - Ineffizient!',
        woundsReceived: '{amount} Verletzungen erhalten!',
        unitNotReady: 'Einheit nicht bereit',
        unitAlreadyActivated: 'Einheit bereits aktiviert',
        unitActivated: '{unit} aktiviert: {applied}',
        enemiesDefeated: '{count} Feinde besiegt!',
        attackWeak: 'Angriff zu schwach für normale Feinde ({attack} vs {armor})',
        bossDamaged: '{enemy} erleidet {amount} Schaden! ({current}/{max} HP)',
        bossDefeatedAttack: '🏆 {enemy} wurde besiegt! +{amount} Ruhm!',
        critHit: '💥 KRITISCHER TREFFER!',
        heroStatusDamage: 'Held erleidet {amount} Schaden durch Statuseffekte!',
        enemyStatusDamage: '{enemy} erleidet {amount} Schaden!',
        paralyzeEffect: 'Versteinerung! Der Held muss alle Nicht-Wunden-Karten abwerfen.',
        assassinateRestriction: '{enemy} ist ein Attentäter! Schaden kann nicht auf Einheiten zugewiesen werden.',
        phaseDamageOnly: 'Schadenszuweisung ist nur in der Schadensphase möglich.',
        cardPlayed: 'Karte gespielt: {card}',
        message: 'Kampf gegen {count} Feinde!',
        combatEnded: 'Kampf beendet',
        uiActions: {
            endRanged: 'Fernkampf beenden -> Blocken',
            endBlock: 'Blocken beenden -> Schaden',
            acceptDamage: 'Schaden akzeptieren (Rest auf Held)',
            executeAttack: 'Angriff ausführen',
            endCombat: 'Kampf beenden'
        },
        boss: {
            enraged: '{name} wird wütend! Angriff erhöht!',
            summons: '{name} beschwört {count} {enemy}!',
            heals: '{name} heilt sich um {amount}!',
            doubleAttack: '{name} greift nun doppelt an!',
            manaburn: '{name} verbrennt {amount} Mana des Helden!'
        },
        fightAgainst: 'Kampf gegen {enemy}!',
        victoryOver: 'Sieg über {enemy}!',
        fameReward: '+{amount} Ruhm für den Sieg.',
        dungeonCleared: 'Verlies gesäubert! Du findest ein Artefakt.',
        ruinCleared: 'Ruine gesäubert! Du findest einen Schatz.',
        tombCleared: 'Grabstätte gesäubert! Du findest uralte Schriftrollen.',
        labyrinthCleared: 'Labyrinth bezwungen! Ein mächtiges Artefakt gehört dir.',
        spawningCleared: 'Brutstätte vernichtet! Die Gegend ist wieder sicher.',
        rewardClaimed: '{card} beansprucht!',
        siteConquered: '{site} erobert!',
        defensiveJoin: '{count} verteidigende Feinde schließen sich dem Kampf an!',
        defeatAgainst: 'Niederlage gegen {enemy}.',
        retreatFrom: 'Rückzug aus dem Kampf gegen {enemy}.',
        efficiency: {
            generic: 'Ineffzienter Block',
            fire_vs_fire: 'Feuer-Block halbiert gegen Feuer-Angriff',
            physical_vs_fire: 'Physischer Block halbiert gegen Feuer-Angriff',
            ice_vs_ice: 'Eis-Block halbiert gegen Eis-Angriff',
            physical_vs_ice: 'Physischer Block halbiert gegen Eis-Angriff',
            physical_vs_cold_fire: 'Physischer Block halbiert gegen Kaltes Feuer',
            fire_vs_cold_fire: 'Feuer-Block halbiert gegen Kaltes Feuer',
            ice_vs_cold_fire: 'Eis-Block halbiert gegen Kaltes Feuer',
            unit_vs_elemental: 'Einheiten-Block halbiert gegen Elementar-Angriff'
        }
    },

    // Cards
    cards: {
        basicEffect: 'Basis-Effekt',
        sideways: 'Seitlich spielen',
        sidewaysHint: '+1 Bewegung/Angriff/Block/Einfluss',
        manaCost: 'Mana-Kosten',
        types: {
            action: 'Aktion',
            spell: 'Zauber',
            artifact: 'Artefakt',
            wound: 'Wunde'
        },
        colors: {
            red: 'Rot',
            blue: 'Blau',
            green: 'Grün',
            white: 'Weiß',
            gold: 'Gold'
        },
        actions: {
            attack: 'Angriff',
            block: 'Block',
            movement: 'Bewegung',
            influence: 'Einfluss',
            healing: 'Heilung'
        },
        woundHint: 'Blockiert einen Kartenslot',
        sidewaysAction: 'Rechtsklick: Seitlich (+1)',
        none: 'Keine',
        basic: 'Basis',
        strong: 'Stark',
        sidewaysModal: {
            title: 'Karte seitlich spielen',
            subtitle: 'Wähle einen Effekt (+1)',
            cancel: 'Abbrechen'
        }
    },

    // Achievements
    achievements: {
        first_blood: { name: 'Erste Beute', desc: 'Besiege deinen ersten Feind' },
        slayer: { name: 'Schlächter', desc: 'Besiege 10 Feinde' },
        perfect_combat: { name: 'Perfekter Kampf', desc: 'Gewinne einen Kampf ohne Verletzungen' },
        dragon_slayer: { name: 'Drachentöter', desc: 'Besiege einen Drachen' },
        explorer: { name: 'Entdecker', desc: 'Erkunde 3 neue Gebiete' },
        cartographer: { name: 'Kartograph', desc: 'Erkunde 10 neue Gebiete' },
        site_visitor: { name: 'Reisender', desc: 'Besuche 5 verschiedene Orte' },
        level_up: { name: 'Aufsteigend', desc: 'Erreiche Level 2' },
        master: { name: 'Meister', desc: 'Erreiche Level 5' },
        deck_builder: { name: 'Deck-Baumeister', desc: 'Sammle 20 Karten' },
        speed_runner: { name: 'Schnellläufer', desc: 'Gewinne in unter 20 Zügen' },
        mana_master: { name: 'Mana-Meister', desc: 'Nutze 50 Mana-Würfel' },
        card_master: { name: 'Kartenmeister', desc: 'Spiele 100 Karten' },
        survivor: { name: 'Überlebender', desc: 'Überlebe mit nur 1 HP' },
        pacifist_win: { name: 'Pazifist', desc: 'Gewinne ohne eine Angriffskarte zu spielen' }
    },

    // Skills
    skills: {
        flight: { name: 'Flug', desc: 'Ignoriere Bewegungskosten' },
        motivation: { name: 'Motivation', desc: '+2 Karten, +1 Weißes Mana' },
        dragon_scales: { name: 'Drachenschuppen', desc: '+2 Rüstung, Feuer-Resistenz' },
        freezing_breath: { name: 'Eis-Atem', desc: 'Friere Feinde ein' },
        crystal_mastery: { name: 'Kristall-Meisterschaft', desc: 'Joker-Mana' },
        glittering_fortune: { name: 'Glitzerndes Glück', desc: 'Runden-Kristall' },
        siege_mastery: { name: 'Belagerungs-Meister', desc: '+2 Belagerung' },
        essence_flow: { name: 'Essenz-Fluss', desc: 'Karte + Mana' },
        natural_healing: { name: 'Natürliche Heilung', desc: 'Heile Wunde' },
        noble_manners: { name: 'Edle Manieren', desc: '+2 Einfluss' },
        avenging_spirit: { name: 'Rächender Geist', desc: '+2 Angriff' },
        header: 'Skills',
        ready: 'Bereit',
        used: 'Benutzt'
    },

    // Mana
    mana: {
        armor: 'Rüstung',
        attack: 'Angriff',
        fame: 'Ruhm',
        fortified: 'befestigt',
        brutal: 'Brutal',
        swift: 'Schnell',
        poison: 'Gift',
        fireResist: 'Feuer-Resistenz',
        iceResist: 'Eis-Resistenz',
        physicalResist: 'Physische Resistenz',
        red: 'Rotes Mana',
        blue: 'Blaues Mana',
        green: 'Grünes Mana',
        white: 'Weißes Mana',
        gold: 'Gold-Mana (Joker)',
        black: 'Schwarzes Mana',
        none: 'Kein Mana',
        collected: 'Gesammelt',
        tooltips: {
            red: { title: 'Rotes Mana', desc: 'Verstärkt Angriffs- und Feuerzauber.' },
            blue: { title: 'Blaues Mana', desc: 'Verstärkt Eiszauber und Block-Effekte.' },
            green: { title: 'Grünes Mana', desc: 'Verstärkt Bewegungs- und Heilzauber.' },
            white: { title: 'Weißes Mana', desc: 'Verstärkt Einfluss und spirituelle Effekte.' },
            gold: { title: 'Goldenes Mana', desc: 'Joker! Kann als jede Farbe (außer Schwarz) verwendet werden. Nur tagsüber.' },
            black: { title: 'Schwarzes Mana', desc: 'Mächtiges, aber gefährliches Mana. Verstärkt dunkle Zauber. Nur nachts.' },
            default: { title: 'Mana', desc: 'Magische Energie.' }
        }
    },

    // Terrain
    terrain: {
        plains: { name: 'Ebenen', desc: 'Offenes Grasland. Leicht zu durchqueren.', cost: '2' },
        forest: { name: 'Wald', desc: 'Dichter Wald. Erschwert die Bewegung.', cost: '3' },
        hills: { name: 'Hügel', desc: 'Hügeliges Gelände. Bietet gute Übersicht.', cost: '3' },
        mountains: { name: 'Berge', desc: 'Hohe Berge. Nur schwer passierbar.', cost: '5' },
        desert: { name: 'Wüste', desc: 'Trockene Wüste. Tagsüber sehr anstrengend.', cost: '5' },
        wasteland: { name: 'Ödland', desc: 'Verfluchtes Ödland. Gefährliches Terrain.', cost: '4' },
        water: { name: 'Wasser', desc: 'Tiefes Wasser. Ohne Boot oder Magie unpassierbar.', cost: '∞' },
        unknown: { name: 'Unbekannt', desc: 'Unbekanntes Terrain.', cost: '?' }
    },

    // Sites
    sites: {
        village: 'Dorf',
        keep: 'Festung',
        mageTower: 'Magierturm',
        monastery: 'Kloster',
        dungeon: 'Verlies',
        city: 'Stadt',
        ruin: 'Ruine',
        tomb: 'Grabstätte',
        labyrinth: 'Labyrinth',
        spawningGrounds: 'Brutstätte',
        conquered: 'Erobert',
        visited: 'Besucht',
        actions: {
            heal: 'Heilen',
            recruit: 'Rekrutieren',
            attack: 'Angreifen',
            train: 'Trainieren',
            learn: 'Lernen',
            explore: 'Erkunden'
        }
    },

    // Enemies
    enemies: {
        orc: 'Ork',
        weakling: 'Schwächling',
        guard: 'Wächter',
        draconum: 'Drakonium',
        robber: 'Räuber',
        mage: 'Magier',
        dragon: 'Drache',
        phantom: 'Phantom',
        golem: 'Golem',
        vampire: 'Vampir',
        necromancer: 'Nekromant',
        elemental: 'Feuer-Elementar',
        boss: 'Dunkler Lord',
        dark_lord: 'Dunkler Lord',
        dragon_lord: 'Drachen-König',
        lich_king: 'Lich-König',
        dragonlord: 'Drachen-König', // Handle case differences
        volkare: 'Volkare',
        abilities: {
            descriptions: {
                fortified: 'Befestigt: Immun gegen Fernkampf (außer Belagerung).',
                vampiric: 'Vampirismus: Erhält Rüstung gleich den zugefügten Wunden.',
                poison: 'Gift: Wunden kommen auf den Ablagestapel. Fügt Einheiten doppelte Wunden zu.',
                swift: 'Flink: Benötigt doppelten Blockwert für effizientes Blocken.',
                brutal: 'Brutal: Verursacht doppelten Schaden, wenn ungeblockt.',
                paralyze: 'Lähmung: Bei Wunde muss der Held Nicht-Wunden-Karten abwerfen. Zerstört Einheiten.',
                cumbersome: 'Schwerfällig: Bewegungspunkte reduzieren Block-Anforderung.',
                assassin: 'Attentäter: Schaden kann nicht auf Einheiten zugewiesen werden.',
                fire: 'Feuer-Angriff: Ineffizient mit nicht-Eis/Kaltem Feuer zu blocken.',
                ice: 'Eis-Angriff: Ineffizient mit nicht-Feuer/Kaltem Feuer zu blocken.',
                cold_fire: 'Kaltes Feuer: Nur effizient mit Kaltem Feuer blockbar.',
                physical: 'Physischer Angriff: Ein Standardangriff ohne besondere elementare Eigenschaften.',
                summoner: 'Beschwörer: Ruft vor der Blockphase einen Gegner herbei.',
                elusive: 'Ausweichend: Höhere Rüstung gegen Fernkampf.',
                arcane_immune: 'Arkane Immunität: Immun gegen Nicht-Angriffs- und Nicht-Blockwirkungen (Gift, Brennen, Frost, Schwächung, Schild, Wut). Direkte Angriffe und Betäubung wirken normal.',
                defensive: 'Verteidigend: Feinde mit dieser Fähigkeit unterstützen sich gegenseitig. Wenn du einen verteidigenden Feind an einer Stadt oder Burg angriffst, schließen sich benachbarte verteidigende Feinde an Stadt- und Burgstandorten dem Kampf an.',
                manaburn: 'Manabrand: Verbrennt Mana des Helden (2-4 Kristalle).',
                boss: 'Boss: Ein mächtiger Gegner mit mehreren Phasen und einzigartigen Mechaniken.'
            }
        }
    },

    // Glossary (Game Terms)
    glossary: {
        vampirism: { name: 'Vampirismus', desc: 'Wenn dieser Feind Wunden zufügt, erhält er Rüstung in gleicher Höhe.' },
        fortified: { name: 'Befestigt', desc: 'Immun gegen Fernkampf-Angriffe (außer Belagerung).' },
        paralyze: { name: 'Lähmung', desc: 'Zerstört Einheiten sofort, wenn sie verwundet werden. Zwingt den Helden, Karten abzuwerfen.' },
        swift: { name: 'Flink', desc: 'Benötigt die doppelte Menge an Block, um effizient geblockt zu werden.' },
        brutal: { name: 'Brutal', desc: 'Verursacht doppelten Schaden, wenn er nicht geblockt wird.' },
        poison: { name: 'Gift', desc: 'Wunden kommen direkt auf den Ablagestapel (statt Hand). Fügt Einheiten 2 Wunden zu.' },
        cumbersome: { name: 'Schwerfällig', desc: 'Du kannst Bewegungspunkte ausgeben, um den Angriff dieses Feindes zu reduzieren. Jeder Punkt reduziert Angriff um 1.' },
        assassin: { name: 'Attentäter', desc: 'Schaden von diesem Feind kann nicht Einheiten zugewiesen werden. Muss vom Helden genommen werden.' },
        summoner: { name: 'Beschwörer', desc: 'Beschwört vor der Block-Phase einen zusätzlichen Gegner.' },
        elusive: { name: 'Ausweichend', desc: 'Hat höhere Rüstung gegen Fernkampf-Angriffe.' },
        arcane_immune: { name: 'Arkane Immunität', desc: 'Immun gegen Nicht-Angriffs- und Nicht-Blockwirkungen wie Gift, Brennen, Frost, Schwächung, Schild, Wut. Direkte Angriffe und Betäubung wirken normal.' },
        defensive: { name: 'Verteidigend', desc: 'Feinde mit dieser Fähigkeit unterstützen sich gegenseitig. Wenn du einen verteidigenden Feind an einer Stadt oder Burg angriffst, schließen sich benachbarte verteidigende Feinde an Stadt- und Burgstandorten dem Kampf an.' },
        manaburn: { name: 'Manabrand', desc: 'Verbrennt 2-4 Mana-Kristalle des Helden.' },
        resistance: { name: 'Resistenz', desc: 'Halbiert Schaden/Block von nicht-passenden Elementen (z.B. Feuer gegen Feuer).' },
        block: { name: 'Block', desc: 'Verhindert den Angriff des Feindes. Muss gleich oder höher als der Angriffswert sein.' },
        wound: { name: 'Wunde', desc: 'Negative Karte, die die Hand verstopft. Kann nicht gespielt werden (außer zum Rasten).' },
        armor: { name: 'Rüstung', desc: 'Wert, der überwunden werden muss, um Schaden zu nehmen oder den Feind zu besiegen.' },
        attack: { name: 'Angriff', desc: 'Offensiver Wert. Wird gegen Rüstung gerechnet.' },
        ranged: { name: 'Fernkampf', desc: 'Phase vor dem Blocken. Erlaubt Angriffe ohne Gegenwehr, aber viele Feinde sind immun.' },
        siege: { name: 'Belagerung', desc: 'Starker Angriff, der befestigte Feinde ignorieren kann.' },
        day: { name: 'Tag', desc: 'Goldenes Mana ist nutzbar. Bewegungskosten normal.' },
        night: { name: 'Nacht', desc: 'Schwarzes Mana ist nutzbar. Zauberkarten sind stärker. Sichtweite im Dungeon reduziert.' }
    },
    // PWA
    pwa: {
        ready_offline: 'Spiel ist jetzt offline verfügbar! 🚀'
    },

    // Tutorial
    tutorial: {
        welcome: {
            title: 'Willkommen bei Mage Knight!',
            text: 'In diesem Tutorial lernst du die Grundlagen. Klicke auf "Weiter", um loszulegen.'
        },
        heroStats: {
            title: 'Dein Held',
            text: 'Hier siehst du deinen Namen, Ruhm, Rüstung, Bewegungspunkte und Handlimit. Ruhm bringt dich im Level nach oben.'
        },
        handCards: {
            title: 'Deine Hand',
            text: 'Deine Aktionskarten. Linksklick zum Spielen, Rechtsklick für starke Effekte (+1). Wunden blockieren Karten-Slots.'
        },
        manaSource: {
            title: 'Mana-Quelle',
            text: 'Würfle zu Beginn deines Zuges Mana. Tagsüber: Rot, Blau, Grün, Weiß, Gold. Nachts: Schwarz statt Gold. Gold = Joker!'
        },
        movement: {
            title: 'Bewegung',
            text: 'Klicke auf ein leuchtendes Feld, um dich zu bewegen. Kosten hängen vom Gelände ab (Ebenen=2, Wald=3, Berge=5).'
        },
        endTurn: {
            title: 'Zug beenden',
            text: 'Wenn du fertig bist, klicke "Zug beenden". Nicht genutzte Bewegung/Einfluss verfallen. Dann ist der Gegner dran.'
        },
        combatIntro: {
            title: 'Kampf!',
            text: 'Du bist in einen Kampf verwickelt. Der Kampf hat Phasen: Fernkampf → Blocken → Schaden → Angriff.'
        },
        rangedPhase: {
            title: 'Fernkampf-Phase',
            text: 'Spiele Angriffs-/Belagerungskarten, um Feinde vor dem Blocken zu schwächen. Viele Feinde sind gegen Fernkampf immun (Befestigt).'
        },
        blockPhase: {
            title: 'Block-Phase',
            text: 'Blocke Feind-Angriffe mit Blockkarten. Element beachten: Feuer blockt man mit Eis, Eis mit Feuer. "Zug beenden" → Block-Phase.'
        },
        attackPhase: {
            title: 'Angriffs-Phase',
            text: 'Jetzt greifst du an! Spiele Angriffskarten, um Feinde zu besiegen. "Zug beenden" führt den Angriff aus.'
        },
        complete: {
            title: 'Tutorial abgeschlossen!',
            text: 'Du kennst jetzt die Grundlagen. Viel Erfolg bei der Eroberung von Mage Knight!'
        },
        btn: {
            next: 'Weiter',
            prev: 'Zurück',
            skip: 'Überspringen',
            start: 'Los geht\'s!'
        },
        hint: {
            move: '💡 Klicke auf ein leuchtendes Feld, um dich zu bewegen (oder Pfeiltasten + Leertaste)',
            endTurn: '💡 Drücke "Zug beenden" (oder Taste E), wenn du fertig bist',
            playCard: '💡 Linksklick auf eine Karte zum Spielen, Rechtsklick für starken Effekt',
            block: '💡 Wähle Blockkarten, klicke auf den Feind, dann "Zug beenden"',
            wait: '⏳ Warte auf Ereignis...'
        },
        completed: 'Tutorial abgeschlossen!'
    }
};

export default de;
