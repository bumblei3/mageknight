import {
    GOLDYX_STARTER_DECK,
    NOROWAS_STARTER_DECK,
    ARYTHEA_STARTER_DECK,
    TOVAK_STARTER_DECK
} from '../card/CardDefinitions';

/**
 * Hero data structure
 */
export interface HeroDefinition {
    id: string;
    name: string;
    title: string;
    description: string;
    stats: { armor: number; handLimit: number };
    starterDeck: any[];
    portrait: string;
    color: string;
}

export const HERO_DEFINITIONS: Record<string, HeroDefinition> = {
    'goldyx': {
        id: 'goldyx',
        name: 'Goldyx',
        title: 'Draconum-Erzmagier',
        description: 'Ein mächtiger Draconum, der das Element Feuer beherrscht und Kristalle effizient nutzt.',
        stats: { armor: 2, handLimit: 5 },
        starterDeck: GOLDYX_STARTER_DECK,
        portrait: 'assets/heroes/goldyx_portrait.webp',
        color: '#ff4d4d'
    },
    'norowas': {
        id: 'norowas',
        name: 'Norowas',
        title: 'Hochelfen-General',
        description: 'Ein charismatischer Anführer, der Einheiten inspiriert und diplomatische Verhandlungen meistert.',
        stats: { armor: 2, handLimit: 5 },
        starterDeck: NOROWAS_STARTER_DECK,
        portrait: 'assets/heroes/norowas_portrait.webp',
        color: '#4db8ff'
    },
    'arythea': {
        id: 'arythea',
        name: 'Arythea',
        title: 'Chaos-Bluthexe',
        description: 'Nutzt Schmerz und Chaos zu ihrem Vorteil. Sie ist verheerend im Angriff, aber oft verwundet.',
        stats: { armor: 2, handLimit: 5 },
        starterDeck: ARYTHEA_STARTER_DECK,
        portrait: 'assets/heroes/arythea_portrait.webp',
        color: '#b84dff'
    },
    'tovak': {
        id: 'tovak',
        name: 'Tovak',
        title: 'Kaiserlicher Taktiker',
        description: 'Ein Meister der Verteidigung und taktischen Planung. Er findet immer einen Weg, feindliche Schläge zu parieren.',
        stats: { armor: 3, handLimit: 5 },
        starterDeck: TOVAK_STARTER_DECK,
        portrait: 'assets/heroes/tovak_portrait.webp',
        color: '#4dffb8'
    }
};

/**
 * Manage availability and creation of Hero instances.
 */
export class HeroManager {
    /**
     * Retrieves a hero definition by its ID.
     */
    static getHero(id: string): HeroDefinition {
        return HERO_DEFINITIONS[id] || HERO_DEFINITIONS['goldyx'];
    }

    /**
     * Gets all available hero definitions.
     */
    static getAllHeroes(): HeroDefinition[] {
        return Object.values(HERO_DEFINITIONS);
    }
}
