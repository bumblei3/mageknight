/**
 * German (de) Translation File for Mage Knight
 */

export default {
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
        gameOver: 'Spiel beendet'
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
            load: 'Laden'
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
            skills: 'Fähigkeiten'
        },
        phases: {
            exploration: 'Erkundung',
            combat: 'Kampf',
            ranged: 'Fernkampf',
            block: 'Block-Phase',
            attack: 'Angriff-Phase'
        }
    },

    // Combat
    combat: {
        started: 'Kampf beginnt!',
        victory: 'Feind besiegt!',
        wounded: 'Du wurdest verwundet!',
        blocked: 'Angriff geblockt!',
        damage: '{amount} Schaden zugefügt',
        fameGained: '+{amount} Ruhm erhalten',
        enemyDefeated: '{enemy} wurde besiegt!',
        phaseRanged: 'Fernkampf-Phase',
        phaseBlock: 'Block-Phase',
        phaseAttack: 'Angriffs-Phase'
    },

    // Cards
    cards: {
        types: {
            action: 'Aktion',
            spell: 'Zauber',
            artifact: 'Artefakt',
            wound: 'Wunde'
        },
        colors: {
            red: 'Angriff',
            blue: 'Block',
            green: 'Bewegung',
            white: 'Heilung',
            gold: 'Spezial'
        }
    },

    // Mana
    mana: {
        red: 'Rotes Mana',
        blue: 'Blaues Mana',
        green: 'Grünes Mana',
        white: 'Weißes Mana',
        gold: 'Gold-Mana (Joker)',
        black: 'Schwarzes Mana'
    },

    // Terrain
    terrain: {
        plains: 'Ebenen',
        forest: 'Wald',
        hills: 'Hügel',
        mountains: 'Berge',
        desert: 'Wüste',
        wasteland: 'Ödland',
        water: 'Wasser'
    },

    // Sites
    sites: {
        village: 'Dorf',
        keep: 'Festung',
        mageTower: 'Magierturm',
        monastery: 'Kloster',
        dungeon: 'Verlies',
        city: 'Stadt'
    },

    // Enemies
    enemies: {
        orc: 'Ork',
        draconum: 'Drakonium',
        guard: 'Wächter',
        mage: 'Magier',
        dragon: 'Drache',
        phantom: 'Phantom',
        golem: 'Golem',
        vampire: 'Vampir',
        darkLord: 'Dunkler Lord',
        dragonLord: 'Drachen-König',
        lichKing: 'Lich-König'
    },

    // Skills
    skills: {
        motivation: 'Motivation',
        essenceFlow: 'Essenz-Fluss',
        freezingBreath: 'Eis-Atem',
        flight: 'Flug',
        dragonScales: 'Drachenschuppen'
    },

    // Events
    events: {
        shrine: 'Verlassener Schrein',
        ambush: 'Hinterhalt!',
        cache: 'Verstecktes Lager',
        merchant: 'Wandernder Händler',
        ancientTomb: 'Uralte Grabkammer',
        banditCamp: 'Banditenlager'
    },

    // Tutorial
    tutorial: {
        welcome: 'Willkommen bei Mage Knight!',
        movement: 'Klicke auf ein Hexfeld um dich zu bewegen.',
        combat: 'Kämpfe gegen Feinde um Ruhm zu sammeln.',
        mana: 'Nutze Mana um deine Karten zu verstärken.',
        cards: 'Spiele Karten aus deiner Hand.',
        skip: 'Tutorial überspringen',
        next: 'Weiter'
    },

    // Settings
    settings: {
        title: 'Einstellungen',
        language: 'Sprache',
        sound: 'Sound',
        music: 'Musik',
        tutorial: 'Tutorial anzeigen'
    },

    // Notifications
    notifications: {
        saved: 'Spiel gespeichert!',
        loaded: 'Spiel geladen!',
        error: 'Ein Fehler ist aufgetreten.',
        levelUp: 'Level aufgestiegen!'
    }
};
