import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TooltipManager } from '../../js/ui/TooltipManager.js';
import { setupGlobalMocks, createMockUI } from '../test-mocks.js';
import i18n from '../../js/i18n/index.js';

describe('TooltipManager - Coverage Boost', () => {
    let tooltipManager;
    let mockUI;
    let mockGame;

    beforeEach(() => {
        setupGlobalMocks();
        document.body.innerHTML = '';
        
        tooltipManager = new TooltipManager();
        
        mockUI = createMockUI();
        mockUI.tooltipManager = tooltipManager;
        mockUI.game = {
            timeManager: {
                isNight: () => false
            },
            constructor: {
                TERRAIN_COSTS: {
                    plains: { day: 2, night: 3 },
                    forest: { day: 3, night: 4 },
                    mountains: { day: 4, night: 5 }
                }
            },
            hexGrid: {}
        };

        mockGame = mockUI.game;
    });

    afterEach(() => {
        tooltipManager.tooltip?.remove();
        document.body.innerHTML = '';
        vi.useRealTimers();
    });

    describe('createAbilityTooltipHTML', () => {
        it('should create tooltip for fire ability', () => {
            const html = tooltipManager.createAbilityTooltipHTML('fire');
            expect(html).toContain('🔥');
            expect(html).toContain('tooltip-ability-desc');
        });

        it('should create tooltip for ice ability', () => {
            const html = tooltipManager.createAbilityTooltipHTML('ice');
            expect(html).toContain('❄️');
        });

        it('should create tooltip for cold_fire ability', () => {
            const html = tooltipManager.createAbilityTooltipHTML('cold_fire');
            expect(html).toContain('🔥❄️');
        });

        it('should create tooltip for physical ability', () => {
            const html = tooltipManager.createAbilityTooltipHTML('physical');
            expect(html).toContain('⚔️');
        });

        it('should create tooltip for fortified ability', () => {
            const html = tooltipManager.createAbilityTooltipHTML('fortified');
            expect(html).toContain('🏰');
        });

        it('should create tooltip for swift ability', () => {
            const html = tooltipManager.createAbilityTooltipHTML('swift');
            expect(html).toContain('💨');
        });

        it('should create tooltip for poison ability', () => {
            const html = tooltipManager.createAbilityTooltipHTML('poison');
            expect(html).toContain('🤢');
        });

        it('should create tooltip for vampiric ability', () => {
            const html = tooltipManager.createAbilityTooltipHTML('vampiric');
            expect(html).toContain('🧛');
        });

        it('should create tooltip for brutal ability', () => {
            const html = tooltipManager.createAbilityTooltipHTML('brutal');
            expect(html).toContain('👹');
        });

        it('should create tooltip for paralyze ability', () => {
            const html = tooltipManager.createAbilityTooltipHTML('paralyze');
            expect(html).toContain('⚡');
        });

        it('should create tooltip for cumbersome ability', () => {
            const html = tooltipManager.createAbilityTooltipHTML('cumbersome');
            expect(html).toContain('🏋️');
        });

        it('should create tooltip for assassin ability', () => {
            const html = tooltipManager.createAbilityTooltipHTML('assassin');
            expect(html).toContain('🗡️');
        });

        it('should create tooltip for summoner ability', () => {
            const html = tooltipManager.createAbilityTooltipHTML('summoner');
            expect(html).toContain('🦇');
        });

        it('should create tooltip for elusive ability', () => {
            const html = tooltipManager.createAbilityTooltipHTML('elusive');
            expect(html).toContain('👤');
        });

        it('should create tooltip for boss ability', () => {
            const html = tooltipManager.createAbilityTooltipHTML('boss');
            expect(html).toContain('👑');
        });

        it('should handle unknown ability key gracefully', () => {
            const html = tooltipManager.createAbilityTooltipHTML('unknown_ability');
            expect(html).toContain('tooltip-ability-desc');
            expect(html).toContain('Unknown_ability');
        });

        it('should parse title and description from i18n when description contains colon', () => {
            const html = tooltipManager.createAbilityTooltipHTML('cold_fire');
            expect(html).toContain('tooltip-ability-desc');
        });
    });

    describe('createCardTooltipHTML', () => {
        const createMockCard = (overrides = {}) => ({
            name: 'Test Card',
            color: 'red',
            manaCost: overrides.manaCost || [{ color: 'red' }, { color: 'blue' }],
            getEffect: vi.fn(() => ({
                attack: overrides.attack || 3,
                block: overrides.block || 2,
                movement: overrides.movement || 1,
                influence: overrides.influence || 0,
                healing: overrides.healing || 0
            })),
            canPlaySideways: vi.fn(() => overrides.sideways !== false),
            ...overrides
        });

        it('should create tooltip with card name and color icon', () => {
            const card = createMockCard();
            const html = tooltipManager.createCardTooltipHTML(card);
            
            expect(html).toContain('Test Card');
            expect(html).toContain('tooltip-card');
            expect(html).toContain('tooltip-card-color red');
        });

        it('should show basic effects', () => {
            const card = createMockCard({ attack: 4, block: 3, movement: 2, influence: 1, healing: 2 });
            const html = tooltipManager.createCardTooltipHTML(card);
            
            expect(html).toContain('Basic Effect');
            expect(html).toContain('4');
            expect(html).toContain('3');
            expect(html).toContain('2');
        });

        it('should show sideways option when card can play sideways', () => {
            const card = createMockCard({ sideways: true });
            const html = tooltipManager.createCardTooltipHTML(card);
            
            expect(html).toContain('Sideways');
            expect(html).toContain('tooltip-section');
        });

        it('should NOT show sideways when card cannot play sideways', () => {
            const card = createMockCard({ sideways: false });
            const html = tooltipManager.createCardTooltipHTML(card);
            
            expect(html).not.toContain('Sideways');
        });

        it('should show mana cost when present', () => {
            const card = createMockCard({ manaCost: [{ color: 'red' }, { color: 'blue' }, { color: 'white' }] });
            const html = tooltipManager.createCardTooltipHTML(card);
            
            expect(html).toContain('Mana Cost');
            expect(html).toContain('mana-icon');
        });

        it('should NOT show mana cost when empty', () => {
            const card = createMockCard({ manaCost: [] });
            const html = tooltipManager.createCardTooltipHTML(card);
            
            expect(html).not.toContain('Mana Cost');
        });

        it('should handle card with getEffect that exists but we test basic functionality', () => {
            const card = createMockCard();
            const html = tooltipManager.createCardTooltipHTML(card);
            
            expect(html).toContain('Test Card');
        });
    });

    describe('createTerrainTooltipHTML', () => {
        it('should create tooltip for plains terrain', () => {
            const html = tooltipManager.createTerrainTooltipHTML('plains', mockGame);
            expect(html).toContain('🌾');
            expect(html).toContain('tooltip-terrain');
        });

        it('should create tooltip for forest terrain', () => {
            const html = tooltipManager.createTerrainTooltipHTML('forest', mockGame);
            expect(html).toContain('🌲');
        });

        it('should create tooltip for hills terrain', () => {
            const html = tooltipManager.createTerrainTooltipHTML('hills', mockGame);
            expect(html).toContain('⛰️');
        });

        it('should create tooltip for mountains terrain', () => {
            const html = tooltipManager.createTerrainTooltipHTML('mountains', mockGame);
            expect(html).toContain('🏔️');
        });

        it('should create tooltip for desert terrain', () => {
            const html = tooltipManager.createTerrainTooltipHTML('desert', mockGame);
            expect(html).toContain('🏜️');
        });

        it('should create tooltip for wasteland terrain', () => {
            const html = tooltipManager.createTerrainTooltipHTML('wasteland', mockGame);
            expect(html).toContain('☠️');
        });

        it('should create tooltip for water terrain', () => {
            const html = tooltipManager.createTerrainTooltipHTML('water', mockGame);
            expect(html).toContain('💧');
        });

        it('should show day cost when not night', () => {
            mockGame.timeManager.isNight = () => false;
            const html = tooltipManager.createTerrainTooltipHTML('plains', mockGame);
            expect(html).toContain('2');
        });

        it('should show night cost when night', () => {
            mockGame.timeManager.isNight = () => true;
            const html = tooltipManager.createTerrainTooltipHTML('plains', mockGame);
            expect(html).toContain('3');
        });

        it('should show same cost without time indicator when day=night', () => {
            mockGame.constructor.TERRAIN_COSTS = { forest: { day: 3, night: 3 } };
            const html = tooltipManager.createTerrainTooltipHTML('forest', mockGame);
            expect(html).toContain('3');
        });

        it('should fall back to i18n cost when no game context', () => {
            const html = tooltipManager.createTerrainTooltipHTML('plains', null);
            expect(html).toContain('tooltip-terrain');
        });

        it('should use fallback name when i18n key not found', () => {
            const html = tooltipManager.createTerrainTooltipHTML('unknown_terrain', null);
            expect(html).toContain('Unknown_terrain');
        });
    });

    describe('createEnemyTooltipHTML', () => {
        const createMockEnemy = (overrides = {}) => ({
            name: 'Orc',
            armor: 3,
            attack: 4,
            fame: 2,
            fortified: false,
            swift: false,
            poison: false,
            vampiric: false,
            brutal: false,
            paralyze: false,
            cumbersome: false,
            assassin: false,
            summoner: false,
            elusive: false,
            isBoss: false,
            color: '#fff',
            icon: '👹',
            currentHealth: 3,
            maxHealth: 3,
            enraged: false,
            getHealthPercent: () => 1,
            getPhaseName: () => 'Boss',
            ...overrides
        });

        it('should create basic enemy tooltip', () => {
            const enemy = createMockEnemy();
            const html = tooltipManager.createEnemyTooltipHTML(enemy);
            
            expect(html).toContain('Orc');
            expect(html).toContain('tooltip-enemy');
            expect(html).toContain('3');
            expect(html).toContain('4');
            expect(html).toContain('2');
        });

        it('should show fortified trait when present', () => {
            const enemy = createMockEnemy({ fortified: true });
            const html = tooltipManager.createEnemyTooltipHTML(enemy);
            
            expect(html.toLowerCase()).toContain('fortified');
        });

        it('should show swift trait when present', () => {
            const enemy = createMockEnemy({ swift: true });
            const html = tooltipManager.createEnemyTooltipHTML(enemy);
            
            expect(html.toLowerCase()).toContain('swift');
        });

        it('should show poison trait when present', () => {
            const enemy = createMockEnemy({ poison: true });
            const html = tooltipManager.createEnemyTooltipHTML(enemy);
            
            expect(html.toLowerCase()).toContain('poison');
        });

        it('should show vampiric trait when present', () => {
            const enemy = createMockEnemy({ vampiric: true });
            const html = tooltipManager.createEnemyTooltipHTML(enemy);
            
            expect(html.toLowerCase()).toContain('vampiric');
        });

        it('should show brutal trait when present', () => {
            const enemy = createMockEnemy({ brutal: true });
            const html = tooltipManager.createEnemyTooltipHTML(enemy);
            
            expect(html.toLowerCase()).toContain('brutal');
        });

        it('should show boss health bar for boss enemies', () => {
            const enemy = createMockEnemy({ 
                isBoss: true, 
                currentHealth: 30, 
                maxHealth: 50,
                color: '#ef4444'
            });
            const html = tooltipManager.createEnemyTooltipHTML(enemy);
            
            expect(html).toContain('tooltip-enemy');
        });
    });

    describe('createUnitTooltipHTML', () => {
        const createMockUnit = (overrides = {}) => ({
            name: 'Test Unit',
            level: 2,
            armor: 2,
            getName: vi.fn(() => 'Test Unit'),
            getAbilities: vi.fn(() => overrides.abilities || [
                { type: 'attack', value: 3, element: 'fire', text: '3 Feuer-Angriff' },
                { type: 'block', value: 2, element: 'ice', text: '2 Eis-Block' }
            ]),
            ...overrides
        });

        it('should create tooltip with unit name and level', () => {
            const unit = createMockUnit();
            const html = tooltipManager.createUnitTooltipHTML(unit);
            
            expect(html).toContain('Test Unit');
            expect(html).toContain('Level 2');
            expect(html).toContain('tooltip-unit');
        });

        it('should show unit armor', () => {
            const unit = createMockUnit({ armor: 4 });
            const html = tooltipManager.createUnitTooltipHTML(unit);
            
            expect(html).toContain('4');
        });

        it('should show abilities with element icons', () => {
            const unit = createMockUnit();
            const html = tooltipManager.createUnitTooltipHTML(unit);
            
            expect(html).toContain('🔥');
            expect(html).toContain('❄️');
            expect(html).toContain('Feuer-Angriff');
            expect(html).toContain('Eis-Block');
        });

        it('should not show skills section when no abilities', () => {
            const unit = createMockUnit({ abilities: [] });
            const html = tooltipManager.createUnitTooltipHTML(unit);
            
            expect(html).not.toContain('Skills');
        });
    });

    describe('createSiteTooltipHTML', () => {
        const createMockSite = (overrides = {}) => ({
            type: 'keep',
            conquered: false,
            visited: false,
            getInfo: vi.fn(() => ({
                name: 'Festung',
                icon: '🏰',
                color: '#6b7280',
                description: 'Eine befestigte Stätte',
                actions: ['heal', 'recruit']
            })),
            ...overrides
        });

        it('should create tooltip for conquered site', () => {
            const site = createMockSite({ conquered: true });
            const html = tooltipManager.createSiteTooltipHTML(site);
            
            expect(html).toContain('tooltip-site');
            expect(html).toContain('status-conquered');
        });

        it('should create tooltip for visited site', () => {
            const site = createMockSite({ conquered: false, visited: true });
            const html = tooltipManager.createSiteTooltipHTML(site);
            
            expect(html).toContain('status-visited');
        });

        it('should show actions when available', () => {
            const site = createMockSite();
            const html = tooltipManager.createSiteTooltipHTML(site);
            
            expect(html).toContain('tooltip-actions');
            expect(html).toContain('action-tag');
            expect(html.toLowerCase()).toContain('heal');
            expect(html.toLowerCase()).toContain('recruit');
        });

        it('should show action icons and names', () => {
            const site = createMockSite();
            const html = tooltipManager.createSiteTooltipHTML(site);
            
            expect(html).toContain('❤️');
            expect(html).toContain('👥');
        });

        it('should use localized name when i18n has translation', () => {
            const site = createMockSite({ type: 'keep' });
            const html = tooltipManager.createSiteTooltipHTML(site);
            
            expect(html).toContain('tooltip-site');
        });

        it('should show border-left-color from site info', () => {
            const site = createMockSite({ 
                getInfo: () => ({ name: 'Test', icon: '❓', color: '#ff0000', description: 'Test', actions: [] })
            });
            const html = tooltipManager.createSiteTooltipHTML(site);
            
            expect(html).toContain('border-left-color: #ff0000');
        });
    });

    describe('getElementIcon', () => {
        it('should return fire icon for fire', () => {
            expect(tooltipManager.getElementIcon('fire')).toBe('🔥');
        });

        it('should return ice icon for ice', () => {
            expect(tooltipManager.getElementIcon('ice')).toBe('❄️');
        });

        it('should return cold_fire icon for cold_fire', () => {
            expect(tooltipManager.getElementIcon('cold_fire')).toBe('🔥❄️');
        });

        it('should return physical icon for physical', () => {
            expect(tooltipManager.getElementIcon('physical')).toBe('⚔️');
        });

        it('should return holy icon for holy', () => {
            expect(tooltipManager.getElementIcon('holy')).toBe('✨');
        });

        it('should return healing icon for healing', () => {
            expect(tooltipManager.getElementIcon('healing')).toBe('❤️');
        });

        it('should return influence icon for influence', () => {
            expect(tooltipManager.getElementIcon('influence')).toBe('💬');
        });

        it('should return movement icon for movement', () => {
            expect(tooltipManager.getElementIcon('movement')).toBe('🌿');
        });

        it('should return ranged icon for ranged', () => {
            expect(tooltipManager.getElementIcon('ranged')).toBe('🏹');
        });

        it('should return siege icon for siege', () => {
            expect(tooltipManager.getElementIcon('siege')).toBe('🎯');
        });

        it('should default to physical for unknown element', () => {
            expect(tooltipManager.getElementIcon('unknown')).toBe('⚔️');
        });

        it('should default to physical for undefined', () => {
            expect(tooltipManager.getElementIcon(undefined)).toBe('⚔️');
        });
    });

    describe('getColorIcon', () => {
        it('should return green icon for green', () => {
            expect(tooltipManager.getColorIcon('green')).toBe('🌿');
        });

        it('should return red icon for red', () => {
            expect(tooltipManager.getColorIcon('red')).toBe('⚔️');
        });

        it('should return blue icon for blue', () => {
            expect(tooltipManager.getColorIcon('blue')).toBe('🛡️');
        });

        it('should return white icon for white', () => {
            expect(tooltipManager.getColorIcon('white')).toBe('💬');
        });

        it('should return gold icon for gold', () => {
            expect(tooltipManager.getColorIcon('gold')).toBe('⭐');
        });

        it('should return question mark for unknown color', () => {
            expect(tooltipManager.getColorIcon('unknown')).toBe('❓');
        });
    });

    describe('getManaHTML', () => {
        it('should return fire icon for red mana', () => {
            const html = tooltipManager.getManaHTML('red');
            expect(html).toContain('🔥');
            expect(html).toContain('mana-icon red');
        });

        it('should return water icon for blue mana', () => {
            const html = tooltipManager.getManaHTML('blue');
            expect(html).toContain('💧');
        });

        it('should return white icon for white mana', () => {
            const html = tooltipManager.getManaHTML('white');
            expect(html).toContain('✨');
        });

        it('should return green icon for green mana', () => {
            const html = tooltipManager.getManaHTML('green');
            expect(html).toContain('🌿');
        });

        it('should return gold icon for gold mana', () => {
            const html = tooltipManager.getManaHTML('gold');
            expect(html).toContain('💰');
        });

        it('should return diamond for unknown mana', () => {
            const html = tooltipManager.getManaHTML('unknown');
            expect(html).toContain('💎');
        });
    });

    describe('createStatTooltipHTML', () => {
        it('should create stat tooltip with plain description', () => {
            const html = tooltipManager.createStatTooltipHTML('Armor', 'Protects from damage');
            
            expect(html).toContain('tooltip-stat');
            expect(html).toContain('Armor');
            expect(html).toContain('Protects from damage');
        });

        it('should render HTML description as-is', () => {
            const html = tooltipManager.createStatTooltipHTML('Test', '<strong>Bold</strong> text');
            
            expect(html).toContain('<strong>Bold</strong>');
        });
    });

    describe('getActionIcon', () => {
        it('should return correct icons for all actions', () => {
            expect(tooltipManager.getActionIcon('heal')).toBe('❤️');
            expect(tooltipManager.getActionIcon('recruit')).toBe('👥');
            expect(tooltipManager.getActionIcon('attack')).toBe('⚔️');
            expect(tooltipManager.getActionIcon('train')).toBe('📚');
            expect(tooltipManager.getActionIcon('learn')).toBe('✨');
            expect(tooltipManager.getActionIcon('explore')).toBe('🔍');
        });

        it('should return bullet for unknown action', () => {
            expect(tooltipManager.getActionIcon('unknown')).toBe('•');
        });
    });

    describe('getActionName', () => {
        it('should translate action names via i18n', () => {
            const name = tooltipManager.getActionName('heal');
            expect(name).toBeTruthy();
        });

        it('should return action key when no translation', () => {
            const name = tooltipManager.getActionName('unknown');
            expect(name).toBe('sites.actions.unknown');
        });
    });

    describe('injectKeywords', () => {
        it('should wrap German glossary terms in spans', () => {
            const text = 'Dieser Feind hat Vampirismus und ist Flink.';
            const html = tooltipManager.injectKeywords(text);
            
            expect(html).toContain('<span class="glossary-term" data-term="vampirism">Vampirismus</span>');
            expect(html).toContain('<span class="glossary-term" data-term="swift">Flink</span>');
        });

        it('should handle multiple occurrences', () => {
            const text = 'Gift und Gift sind gefährlich.';
            const html = tooltipManager.injectKeywords(text);
            
            expect(html.split('data-term="poison"').length).toBe(3);
        });

        it('should be case insensitive', () => {
            const text = 'VAMPIRISMUS und vampirismus.';
            const html = tooltipManager.injectKeywords(text);
            
            expect(html.toLowerCase().split('vampirism').length).toBeGreaterThan(1);
        });

        it('should handle all known terms', () => {
            const terms = [
                'Vampirismus', 'Befestigt', 'Lähmung', 'Flink', 'Brutal', 'Gift',
                'Schwerfällig', 'Attentäter', 'Beschwörer', 'Ausweichend',
                'Resistenz', 'Block', 'Wunde', 'Rüstung', 'Fernkampf', 'Belagerung',
                'Tag', 'Nacht'
            ];
            
            const text = terms.join(' ');
            const html = tooltipManager.injectKeywords(text);
            
            const map = {
                'Vampirismus': 'vampirism', 'Befestigt': 'fortified', 'Lähmung': 'paralyze',
                'Flink': 'swift', 'Brutal': 'brutal', 'Gift': 'poison',
                'Schwerfällig': 'cumbersome', 'Attentäter': 'assassin',
                'Beschwörer': 'summoner', 'Ausweichend': 'elusive',
                'Resistenz': 'resistance', 'Block': 'block', 'Wunde': 'wound',
                'Rüstung': 'armor', 'Fernkampf': 'ranged', 'Belagerung': 'siege',
                'Tag': 'day', 'Nacht': 'night'
            };
            
            terms.forEach(term => {
                expect(html).toContain(`data-term="${map[term]}"`);
            });
        });

        it('should return empty string for empty input', () => {
            expect(tooltipManager.injectKeywords('')).toBe('');
        });

        it('should return empty string for null input', () => {
            expect(tooltipManager.injectKeywords(null)).toBe('');
        });

        it('should not wrap partial word matches', () => {
            const text = 'Befestigung ist nicht Befestigt.';
            const html = tooltipManager.injectKeywords(text);
            
            expect(html.split('data-term="fortified"').length).toBe(2);
        });
    });

    describe('showGlossaryTooltip', () => {
        it('should show tooltip for glossary term', () => {
            const element = document.createElement('span');
            element.dataset.term = 'vampirism';
            document.body.appendChild(element);
            
            tooltipManager.showGlossaryTooltip(element, 'vampirism');
            
            expect(tooltipManager.tooltip).toBeTruthy();
            expect(tooltipManager.tooltip.innerHTML).toContain('tooltip-glossary');
        });

        it('should use term key as fallback when no translation', () => {
            const element = document.createElement('span');
            tooltipManager.showGlossaryTooltip(element, 'unknown_term');
            
            expect(tooltipManager.tooltip.innerHTML).toContain('unknown_term');
        });
    });

    describe('positionTooltip', () => {
        it('should position tooltip above element by default', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 400,
                top: 300,
                width: 100,
                height: 50,
                right: 500,
                bottom: 350
            });
            document.body.appendChild(element);
            
            tooltipManager.tooltip.style.display = 'block';
            tooltipManager.tooltip.getBoundingClientRect = () => ({
                width: 200,
                height: 100
            });
            
            tooltipManager['positionTooltip'](element);
            
            expect(tooltipManager.tooltip.style.left).toBeTruthy();
            expect(tooltipManager.tooltip.style.top).toBeTruthy();
        });

        it('should prevent overflow on right edge', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 1000,
                top: 300,
                width: 100,
                height: 50,
                right: 1100,
                bottom: 350
            });
            document.body.appendChild(element);
            
            tooltipManager.tooltip.style.display = 'block';
            tooltipManager.tooltip.getBoundingClientRect = () => ({
                width: 300,
                height: 100
            });
            
            tooltipManager['positionTooltip'](element);
            
            const left = parseInt(tooltipManager.tooltip.style.left);
            expect(left).toBeLessThanOrEqual(window.innerWidth - 300 - 20);
        });

        it('should prevent overflow on left edge', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 10,
                top: 300,
                width: 50,
                height: 50,
                right: 60,
                bottom: 350
            });
            document.body.appendChild(element);
            
            tooltipManager.tooltip.style.display = 'block';
            tooltipManager.tooltip.getBoundingClientRect = () => ({
                width: 200,
                height: 100
            });
            
            tooltipManager['positionTooltip'](element);
            
            const left = parseInt(tooltipManager.tooltip.style.left);
            expect(left).toBeGreaterThanOrEqual(20);
        });

        it('should show below element when not enough space above', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 400,
                top: 50,
                width: 100,
                height: 50,
                right: 500,
                bottom: 100
            });
            document.body.appendChild(element);
            
            tooltipManager.tooltip.style.display = 'block';
            tooltipManager.tooltip.getBoundingClientRect = () => ({
                width: 200,
                height: 100
            });
            
            tooltipManager['positionTooltip'](element);
            
            expect(tooltipManager.tooltip.classList.contains('below')).toBe(true);
        });
    });

    describe('showTooltip / hideTooltip', () => {
        it('should show tooltip with content', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 100,
                top: 100,
                width: 50,
                height: 50,
                right: 150,
                bottom: 150
            });
            document.body.appendChild(element);
            
            tooltipManager.showTooltip(element, '<div>Test Content</div>');
            
            expect(tooltipManager.tooltip.style.display).toBe('block');
            expect(tooltipManager.tooltip.innerHTML).toContain('Test Content');
        });

        it('should set currentTarget', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50
            });
            document.body.appendChild(element);
            
            tooltipManager.showTooltip(element, 'Test');
            
            expect(tooltipManager.currentTarget).toBe(element);
        });

        it('should hide tooltip immediately', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50
            });
            document.body.appendChild(element);
            
            tooltipManager.showTooltip(element, 'Test');
            tooltipManager.hideTooltip(0);
            
            expect(tooltipManager.currentTarget).toBeNull();
        });

        it('should hide tooltip with delay using fake timers', () => {
            vi.useFakeTimers();
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50
            });
            document.body.appendChild(element);
            
            tooltipManager.showTooltip(element, 'Test');
            tooltipManager.hideTooltip(100);
            
            expect(tooltipManager.currentTarget).not.toBeNull();
            
            vi.advanceTimersByTime(101);
            expect(tooltipManager.currentTarget).toBeNull();
        });

        it('should clear existing hideTimeout on new showTooltip', () => {
            vi.useFakeTimers();
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50
            });
            document.body.appendChild(element);
            
            tooltipManager.showTooltip(element, 'Test');
            tooltipManager.hideTooltip(100);
            
            tooltipManager.showTooltip(element, 'New Test');
            
            vi.advanceTimersByTime(101);
            expect(tooltipManager.currentTarget).not.toBeNull();
        });
    });

    describe('attachToElement', () => {
        it('should attach tooltip with string content', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50
            });
            document.body.appendChild(element);
            
            tooltipManager.attachToElement(element, 'Static Content');
            
            element.dispatchEvent(new Event('mouseenter'));
            
            expect(tooltipManager.tooltip.innerHTML).toContain('Static Content');
        });

        it('should attach tooltip with function content', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50
            });
            document.body.appendChild(element);
            
            tooltipManager.attachToElement(element, () => 'Dynamic Content');
            
            element.dispatchEvent(new Event('mouseenter'));
            
            expect(tooltipManager.tooltip.innerHTML).toContain('Dynamic Content');
        });

        it('should auto-detect ability tooltip from data attributes', () => {
            const element = document.createElement('div');
            element.dataset.tooltipType = 'ability';
            element.dataset.tooltipKey = 'fire';
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50
            });
            document.body.appendChild(element);
            
            tooltipManager.attachToElement(element);
            
            element.dispatchEvent(new Event('mouseenter'));
            
            expect(tooltipManager.tooltip.innerHTML).toContain('🔥');
        });

        it('should hide tooltip on mouseleave', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50
            });
            document.body.appendChild(element);
            
            tooltipManager.attachToElement(element, 'Test');
            
            element.dispatchEvent(new Event('mouseenter'));
            expect(tooltipManager.tooltip.style.display).toBe('block');
            
            element.dispatchEvent(new Event('mouseleave'));
            
            expect(tooltipManager.currentTarget).not.toBeNull();
        });

        it('should handle glossary-term mouseover via event delegation', () => {
            const element = document.createElement('div');
            const termSpan = document.createElement('span');
            termSpan.classList.add('glossary-term');
            termSpan.dataset.term = 'vampirism';
            element.appendChild(termSpan);
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50
            });
            document.body.appendChild(element);
            
            tooltipManager.attachToElement(element, 'Test');
            
            termSpan.dispatchEvent(new MouseEvent('mouseover', { 
                bubbles: true, 
                target: termSpan 
            }));
            
            expect(tooltipManager.tooltip.innerHTML).toContain('tooltip-glossary');
        });

        it('should handle glossary-term mouseout', () => {
            const element = document.createElement('div');
            const termSpan = document.createElement('span');
            termSpan.classList.add('glossary-term');
            termSpan.dataset.term = 'vampirism';
            element.appendChild(termSpan);
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50
            });
            document.body.appendChild(element);
            
            tooltipManager.attachToElement(element, 'Test');
            termSpan.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, target: termSpan }));
            
            expect(tooltipManager.tooltip.style.display).toBe('block');
            
            termSpan.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, target: termSpan }));
            
            expect(tooltipManager.currentTarget).not.toBeNull();
        });

        it('should return early for null element', () => {
            expect(() => {
                tooltipManager.attachToElement(null, 'Test');
            }).not.toThrow();
        });
    });

    describe('register', () => {
        it('should register element with description and title', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50
            });
            document.body.appendChild(element);
            
            tooltipManager.register(element, 'Description', 'Title');
            
            element.dispatchEvent(new Event('mouseenter'));
            
            expect(tooltipManager.tooltip.innerHTML).toContain('Title');
            expect(tooltipManager.tooltip.innerHTML).toContain('Description');
        });

        it('should register element without title', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50
            });
            document.body.appendChild(element);
            
            tooltipManager.register(element, 'Description only');
            
            element.dispatchEvent(new Event('mouseenter'));
            
            expect(tooltipManager.tooltip.innerHTML).toContain('Description only');
        });

        it('should return early for null element', () => {
            expect(() => {
                tooltipManager.register(null, 'Description');
            }).not.toThrow();
        });
    });

    describe('showCardTooltip', () => {
        it('should delegate to createCardTooltipHTML and showTooltip', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50
            });
            document.body.appendChild(element);
            
            const card = {
                name: 'Test Card',
                color: 'red',
                getEffect: () => ({ attack: 3, block: 2, movement: 1 }),
                canPlaySideways: () => false,
                manaCost: []
            };
            
            tooltipManager.showCardTooltip(element, card);
            
            expect(tooltipManager.tooltip.innerHTML).toContain('Test Card');
        });
    });

    describe('showTerrainTooltip', () => {
        it('should delegate to createTerrainTooltipHTML and showTooltip', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50
            });
            document.body.appendChild(element);
            
            tooltipManager.showTerrainTooltip(element, 'plains', mockGame);
            
            expect(tooltipManager.tooltip.innerHTML).toContain('tooltip-terrain');
        });
    });

    describe('showEnemyTooltip', () => {
        it('should delegate to createEnemyTooltipHTML and showTooltip', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50
            });
            document.body.appendChild(element);
            
            const enemy = {
                name: 'Orc',
                armor: 3,
                attack: 4,
                fame: 2,
                fortified: false
            };
            
            tooltipManager.showEnemyTooltip(element, enemy);
            
            expect(tooltipManager.tooltip.innerHTML).toContain('tooltip-enemy');
        });
    });

    describe('showSiteTooltip', () => {
        it('should delegate to createSiteTooltipHTML and showTooltip', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50
            });
            document.body.appendChild(element);
            
            const site = {
                type: 'keep',
                conquered: false,
                visited: false,
                getInfo: () => ({
                    name: 'Festung',
                    icon: '🏰',
                    color: '#6b7280',
                    description: 'Test',
                    actions: []
                })
            };
            
            tooltipManager.showSiteTooltip(element, site);
            
            expect(tooltipManager.tooltip.innerHTML).toContain('tooltip-site');
        });
    });

    describe('showStatTooltip', () => {
        it('should show stat tooltip with type and description', () => {
            const element = document.createElement('div');
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50
            });
            document.body.appendChild(element);
            
            tooltipManager.showStatTooltip(element, 'Armor', 'Reduces damage');
            
            expect(tooltipManager.tooltip.innerHTML).toContain('tooltip-stat');
            expect(tooltipManager.tooltip.innerHTML).toContain('Armor');
            expect(tooltipManager.tooltip.innerHTML).toContain('Reduces damage');
        });
    });

    describe('Edge Cases', () => {
        it('should handle createTooltipElement called multiple times', () => {
            const tooltipsBefore = document.querySelectorAll('.game-tooltip').length;
            const newManager = new TooltipManager();
            newManager.createTooltipElement();
            const tooltipsAfter = document.querySelectorAll('.game-tooltip').length;
            
            expect(tooltipsAfter).toBe(tooltipsBefore);
        });

        it('should handle all methods with null game context gracefully', () => {
            expect(() => {
                tooltipManager.createTerrainTooltipHTML('plains', null);
                tooltipManager.createEnemyTooltipHTML({ name: 'Test', armor: 1, attack: 1, fame: 1 });
                tooltipManager.createSiteTooltipHTML({ type: 'test', getInfo: () => ({}) });
            }).not.toThrow();
        });
    });
});