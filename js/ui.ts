import { TooltipManager } from './ui/TooltipManager';
import i18n from './i18n/index';
const { t } = i18n as any;
import { NotificationManager } from './ui/NotificationManager';
import { ModalManager } from './ui/ModalManager';
import { CombatUIManager } from './ui/CombatUIManager';
import { HandRenderer } from './ui/HandRenderer';
import { ManaRenderer } from './ui/ManaRenderer';
import { UnitRenderer } from './ui/UnitRenderer';
import { StatsRenderer } from './ui/StatsRenderer';
import { SkillRenderer } from './ui/SkillRenderer';
import { store, ACTIONS } from './game/Store';
import { eventBus } from './eventBus';
import { GAME_EVENTS } from './constants';
import ParticleSystem from './particles';
import { SaveLoadModal } from './ui/SaveLoadModal';
import { ScenarioSelectionModal } from './ui/ScenarioSelectionModal';
import { HeroSelectionModal } from './ui/HeroSelectionModal';
import { SettingsModal } from './ui/SettingsModal';
import { ShortcutsModal } from './ui/ShortcutsModal';

export interface UIElements {
    fameValue: HTMLElement | null;
    reputationValue: HTMLElement | null;
    heroName: HTMLElement | null;
    heroAvatar: HTMLElement | null;
    heroArmor: HTMLElement | null;
    heroHandLimit: HTMLElement | null;
    heroWounds: HTMLElement | null;
    movementPoints: HTMLElement | null;
    skillList: HTMLElement | null;
    endTurnBtn: HTMLElement | null;
    restBtn: HTMLElement | null;
    exploreBtn: HTMLElement | null;
    newGameBtn: HTMLElement | null;
    languageBtn: HTMLElement | null;
    settingsBtn: HTMLElement | null;
    handCards: HTMLElement | null;
    playedCards: HTMLElement | null;
    playArea: HTMLElement | null;
    manaSource: HTMLElement | null;
    gameLog: HTMLElement | null;
    combatPanel: HTMLElement | null;
    combatInfo: HTMLElement | null;
    combatUnits: HTMLElement | null;
    heroUnits: HTMLElement | null;
    healBtn: HTMLElement | null;
    gameBoard: HTMLElement | null;
    siteModal: HTMLElement | null;
    siteClose: HTMLElement | null;
    siteModalIcon: HTMLElement | null;
    siteModalTitle: HTMLElement | null;
    siteModalDescription: HTMLElement | null;
    siteOptions: HTMLElement | null;
    siteCloseBtn: HTMLElement | null;
    levelUpModal: HTMLElement | null;
    newLevelDisplay: HTMLElement | null;
    skillChoices: HTMLElement | null;
    cardChoices: HTMLElement | null;
    confirmLevelUpBtn: HTMLElement | null;
    eventModal: HTMLElement | null;
    eventClose: HTMLElement | null;
    eventTitle: HTMLElement | null;
    eventDescription: HTMLElement | null;
    eventOptions: HTMLElement | null;
}

/**
 * User Interface Controller (Orchestrator)
 * Manages core HUD elements and delegates specific UI logic to specialized managers.
 */
export class UI {
    public elements: UIElements;
    public game: any;
    public tooltipManager: any;
    public notifications: any;
    public modals: any;
    public combatUI: any;
    public statsRenderer: any;
    public manaRenderer: any;
    public unitRenderer: any;
    public handRenderer: any;
    public skillRenderer: any;
    public saveLoadModal: any;
    public scenarioSelectionModal: any;
    public heroSelectionModal: any;
    public settingsModal: any;
    public shortcutsModal: any;
    public floatingText: any;
    public particleCanvas: HTMLCanvasElement | null = null;
    public particleSystem: any;

    private _logAddedHandler: any;
    private _toastShowHandler: any;
    private _notificationHandler: any;
    private _statsHandler: any;

    constructor() {
        this.elements = this.getElements();

        // Initialize specialized managers
        this.tooltipManager = new TooltipManager();
        this.notifications = new NotificationManager(this.elements, this.tooltipManager);
        this.modals = new ModalManager(this.elements, this);
        this.combatUI = new CombatUIManager(this.elements, this);

        // Initialize renderers
        this.statsRenderer = new StatsRenderer(this.elements, this);
        this.manaRenderer = new ManaRenderer(this.elements, this.tooltipManager, this);
        this.unitRenderer = new UnitRenderer(this.elements, this);
        this.handRenderer = new HandRenderer(this.elements, this.tooltipManager, this);
        this.skillRenderer = new SkillRenderer(this);
        this.saveLoadModal = new SaveLoadModal(this);
        this.scenarioSelectionModal = new ScenarioSelectionModal(this);
        this.heroSelectionModal = new HeroSelectionModal(this);
        this.settingsModal = new SettingsModal(this);
        this.shortcutsModal = new ShortcutsModal(this);

        // Visual effects
        const gameBoard = document.querySelector('#game-board');
        if (gameBoard) {
            import('./ui/FloatingTextManager.js').then(({ FloatingTextManager }) => {
                this.floatingText = new FloatingTextManager(gameBoard as HTMLElement);
                this.setupFloatingTextListeners();
            }).catch(err => console.error('Failed to load FloatingTextManager', err));
        }

        this.setupEventListeners();
        this.setupTooltips();
        this.setupPanelToggles();
        this.setupGlobalListeners();
        this.setupStoreSubscriptions();
    }

    private setupStoreSubscriptions(): void {
        if (!store) return;
        (store as any).subscribe((state: any, action: string) => {
            if (action === (ACTIONS as any).SET_LANGUAGE) {
                this.refreshTranslations();
            }
        });
    }

    private setupFloatingTextListeners(): void {
        if (!this.floatingText) return;

        eventBus.on('DAMAGE_DEALT', (data: any) => {
            if (data.hex) {
                this.floatingText.spawnOnHex(this.game.hexGrid, data.hex, `-${data.amount}`, 'damage');
            } else if (data.x && data.y) {
                this.floatingText.spawn(data.x, data.y, `-${data.amount}`, 'damage');
            }
        });

        eventBus.on('XP_GAINED', (data: any) => {
            const heroHex = this.game.hero.position;
            this.floatingText.spawnOnHex(this.game.hexGrid, heroHex, `+${data.amount} XP`, 'xp');
        });

        eventBus.on('HERO_HEALED', (data: any) => {
            const heroHex = this.game.hero.position;
            this.floatingText.spawnOnHex(this.game.hexGrid, heroHex, `+${data.amount}`, 'heal');
        });

        eventBus.on('MANA_GAINED', (data: any) => {
            const heroHex = this.game.hero.position;
            this.floatingText.spawnOnHex(this.game.hexGrid, heroHex, `+1 ${data.color}`, 'mana');
        });
    }

    private setupSoundListeners(): void {
        if (!this.game || !this.game.sound) return;

        document.addEventListener('click', (e) => {
            if (this.game.sound.ctx && this.game.sound.ctx.state === 'suspended') {
                this.game.sound.ctx.resume();
            }
            if (!this.game.sound.enabled && !this.game.sound.ctx) {
                this.game.sound.init();
            }

            if (e.target instanceof HTMLElement) {
                if (e.target.closest('button') || e.target.closest('.card') || e.target.closest('.interactive')) {
                    this.game.sound.click();
                }
            }
        }, { capture: true });

        eventBus.on('DAMAGE_DEALT', () => this.game.sound.hit());
        eventBus.on('HERO_HEALED', () => this.game.sound.heal());
        eventBus.on('CARD_PLAYED', () => this.game.sound.cardPlay());
        eventBus.on('MANA_GAINED', () => this.game.sound.manaUse());
        eventBus.on('LEVEL_UP', () => this.game.sound.levelUp());
        eventBus.on('COMBAT_START', () => this.game.sound.combatStart());
        eventBus.on('NOTIFY', () => this.game.sound.notification());
    }

    public setGame(game: any): void {
        this.game = game;
        this.combatUI.game = game;
        if (this.elements.skillList) {
            this.skillRenderer.setContainer(this.elements.skillList);
        }

        if (this.settingsModal) {
            this.settingsModal.applySettings(this.settingsModal.settings);
        }

        this.setupSoundListeners();
    }

    private setupPanelToggles(): void {
        const toggles = document.querySelectorAll('.panel-toggle');
        toggles.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const panel = (btn as HTMLElement).closest('.panel');
                if (panel) {
                    panel.classList.toggle('collapsed');
                    if (this.game && this.game.sound) {
                        this.game.sound.click();
                    }
                }
            });
        });
    }

    private setupGlobalListeners(): void {
        this._logAddedHandler = ({ message, type, details }: any) => this.notifications.addLog(message, type, details);
        this._toastShowHandler = ({ message, type }: any) => this.notifications.showToast(message, type);
        this._notificationHandler = ({ message, type }: any) => this.notifications.showNotification(message, type);
        this._statsHandler = (hero: any) => {
            this.updateHeroStats(hero);
            this.updateMovementPoints(hero.movementPoints);
        };

        eventBus.on(GAME_EVENTS.LOG_ADDED, this._logAddedHandler);
        eventBus.on(GAME_EVENTS.TOAST_SHOW, this._toastShowHandler);
        eventBus.on(GAME_EVENTS.NOTIFICATION_SHOW, this._notificationHandler);
        eventBus.on(GAME_EVENTS.STAMP_STATS_UPDATED, this._statsHandler);
    }

    public destroy(): void {
        if (this._logAddedHandler) eventBus.off(GAME_EVENTS.LOG_ADDED, this._logAddedHandler);
        if (this._toastShowHandler) eventBus.off(GAME_EVENTS.TOAST_SHOW, this._toastShowHandler);
        if (this._notificationHandler) eventBus.off(GAME_EVENTS.NOTIFICATION_SHOW, this._notificationHandler);
    }

    private setupTooltips(): void {
        if (this.elements.heroArmor) {
            this.tooltipManager.attachToElement(this.elements.heroArmor,
                this.tooltipManager.createStatTooltipHTML(t('ui.tooltips.armor.title'), t('ui.tooltips.armor.desc')));
        }

        if (this.elements.heroHandLimit) {
            this.tooltipManager.attachToElement(this.elements.heroHandLimit,
                this.tooltipManager.createStatTooltipHTML(t('ui.tooltips.handLimit.title'), t('ui.tooltips.handLimit.desc')));
        }

        if (this.elements.heroWounds) {
            this.tooltipManager.attachToElement(this.elements.heroWounds,
                this.tooltipManager.createStatTooltipHTML(t('ui.tooltips.wounds.title'), t('ui.tooltips.wounds.desc')));
        }

        if (this.elements.fameValue?.parentElement) {
            this.tooltipManager.attachToElement(this.elements.fameValue.parentElement,
                this.tooltipManager.createStatTooltipHTML(t('ui.tooltips.fame.title'), t('ui.tooltips.fame.desc')));
        }

        if (this.elements.reputationValue?.parentElement) {
            this.tooltipManager.attachToElement(this.elements.reputationValue.parentElement,
                this.tooltipManager.createStatTooltipHTML(t('ui.tooltips.reputation.title'), t('ui.tooltips.reputation.desc')));
        }

        const phaseEl = document.getElementById('phase-indicator');
        if (phaseEl) {
            this.tooltipManager.attachToElement(phaseEl,
                this.tooltipManager.createStatTooltipHTML(t('ui.tooltips.phase.title'), t('ui.tooltips.phase.desc')));
        }
    }

    private getElements(): UIElements {
        return {
            fameValue: document.getElementById('fame-value'),
            reputationValue: document.getElementById('reputation-value'),
            heroName: document.getElementById('hero-name'),
            heroAvatar: document.getElementById('hero-avatar'),
            heroArmor: document.getElementById('hero-armor'),
            heroHandLimit: document.getElementById('hero-handlimit'),
            heroWounds: document.getElementById('hero-wounds'),
            movementPoints: document.getElementById('movement-points'),
            skillList: document.getElementById('skill-list'),
            endTurnBtn: document.getElementById('end-turn-btn'),
            restBtn: document.getElementById('rest-btn'),
            exploreBtn: document.getElementById('explore-btn'),
            newGameBtn: document.getElementById('new-game-btn'),
            languageBtn: document.getElementById('language-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            handCards: document.getElementById('hand-cards'),
            playedCards: document.getElementById('played-cards'),
            playArea: document.getElementById('play-area'),
            manaSource: document.getElementById('mana-source'),
            gameLog: document.getElementById('game-log'),
            combatPanel: document.getElementById('combat-panel'),
            combatInfo: document.getElementById('combat-info'),
            combatUnits: document.getElementById('combat-units'),
            heroUnits: document.getElementById('hero-units'),
            healBtn: document.getElementById('heal-btn'),
            gameBoard: document.getElementById('game-board'),
            siteModal: document.getElementById('site-modal'),
            siteClose: document.getElementById('site-close'),
            siteModalIcon: document.getElementById('site-modal-icon'),
            siteModalTitle: document.getElementById('site-modal-title'),
            siteModalDescription: document.getElementById('site-modal-description'),
            siteOptions: document.getElementById('site-options'),
            siteCloseBtn: document.getElementById('site-close-btn'),
            levelUpModal: document.getElementById('level-up-modal'),
            newLevelDisplay: document.getElementById('new-level-display'),
            skillChoices: document.getElementById('skill-choices'),
            cardChoices: document.getElementById('card-choices'),
            confirmLevelUpBtn: document.getElementById('confirm-level-up'),
            eventModal: document.getElementById('event-modal'),
            eventClose: document.getElementById('event-close'),
            eventTitle: document.getElementById('event-title'),
            eventDescription: document.getElementById('event-description'),
            eventOptions: document.getElementById('event-options')
        };
    }

    private setupEventListeners(): void {
        document.addEventListener('mouseover', (e) => {
            if (e.target instanceof HTMLElement) {
                if (e.target.closest('button, .clickable, .card-item')) {
                    if (this.game && this.game.sound) this.game.sound.hover();
                }
            }
        }, { passive: true });

        if (this.elements.siteClose) {
            this.elements.siteClose.addEventListener('click', () => {
                this.hideSiteModal();
                if (this.game && this.game.sound) this.game.sound.click();
            });
        }
        if (this.elements.eventClose) {
            this.elements.eventClose.addEventListener('click', () => {
                this.elements.eventModal?.classList.remove('active');
                if (this.game && this.game.sound) this.game.sound.click();
            });
        }
        if (this.elements.languageBtn) {
            this.elements.languageBtn.addEventListener('click', () => {
                this.toggleLanguage();
                if (this.game && this.game.sound) this.game.sound.click();
            });
        }
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', () => {
                this.settingsModal.show();
                if (this.game && this.game.sound) this.game.sound.click();
            });
        }
    }

    public toggleLanguage(): void {
        const current = (i18n as any).getLanguage();
        const next = current === 'de' ? 'en' : 'de';
        (i18n as any).setLanguage(next);
        this.refreshTranslations();
    }

    public refreshTranslations(): void {
        if (i18n && typeof (i18n as any).translateDocument === 'function') {
            (i18n as any).translateDocument();
        }
    }

    public showFloatingText(element: HTMLElement, text: string, color: string = '#fff'): void {
        this.statsRenderer.showFloatingText(element, text, color);
    }

    public updateHeroStats(hero: any): void {
        this.statsRenderer.updateHeroStats(hero);
        if (this.skillRenderer) {
            this.skillRenderer.render(hero);
        }
    }

    public updateMovementPoints(points: number): void {
        this.statsRenderer.updateMovementPoints(points);
    }

    public renderHandCards(hand: any[], onCardClick: (card: any, index: number) => void, onCardRightClick?: (card: any, index: number) => void): void {
        this.handRenderer.renderHandCards(hand, onCardClick, onCardRightClick);
    }

    public createCardElement(card: any, index: number): HTMLElement {
        return this.handRenderer.createCardElement(card, index);
    }

    public renderManaSource(manaSource: any, onDieClick: (die: any) => void, isNight: boolean = false): void {
        this.manaRenderer.renderManaSource(manaSource, onDieClick, isNight);
    }

    public renderHeroMana(manaInventory: any): void {
        this.manaRenderer.renderHeroMana(manaInventory);
    }

    public addLog(message: string, type: string = 'info', details: any = null): void {
        this.notifications.addLog(message, type, details);
    }

    public clearLog(): void {
        this.notifications.clearLog();
    }

    public showNotification(message: string, type: string = 'info'): void {
        this.notifications.showNotification(message, type);
    }

    public showToast(message: string, type: string = 'info'): void {
        this.notifications.showToast(message, type);
    }

    public showCombatPanel(enemies: any[], phase: string, onEnemyClick: (enemy: any) => void): void {
        this.combatUI.showCombatPanel(enemies, phase, onEnemyClick);
    }

    public hideCombatPanel(): void {
        this.combatUI.hideCombatPanel();
    }

    public updateCombatInfo(enemies: any[], phase: string, onEnemyClick: (enemy: any) => void): void {
        this.combatUI.updateCombatInfo(enemies, phase, onEnemyClick);
    }

    public updateCombatTotals(attackTotal: number, blockTotal: number, phase: string): void {
        this.combatUI.updateCombatTotals(attackTotal, blockTotal, phase);
    }

    public renderEnemy(enemy: any, phase: string, onClick: (enemy: any) => void): HTMLElement {
        return this.combatUI.renderEnemy(enemy, phase, onClick);
    }

    public renderUnitsInCombat(units: any[], phase: string, onUnitActivate: (unit: any) => void): void {
        this.combatUI.renderUnitsInCombat(units, phase, onUnitActivate);
    }

    public renderUnits(units: any[]): void {
        this.unitRenderer.renderUnits(units);
    }

    public showPlayArea(): void {
        this.handRenderer.showPlayArea();
    }

    public hidePlayArea(): void {
        this.handRenderer.hidePlayArea();
    }

    public addPlayedCard(card: any, effect: any): void {
        this.handRenderer.addPlayedCard(card, effect);
    }

    public setButtonEnabled(button: HTMLButtonElement | null, enabled: boolean): void {
        if (button) {
            button.disabled = !enabled;
        }
    }

    public highlightHex(hexGrid: any, q: number, r: number): void {
        if (hexGrid && typeof hexGrid.selectHex === 'function') {
            hexGrid.selectHex(q, r);
        }
    }

    public showSiteModal(interactionData: any): void {
        this.modals.showSiteModal(interactionData);
    }

    public hideSiteModal(): void {
        this.modals.hideSiteModal();
    }

    public renderSiteOptions(options: any[]): void {
        this.modals.renderSiteOptions(options);
    }

    public showEventModal(eventData: any): void {
        this.modals.showEventModal(eventData);
    }

    public getColorName(color: string): string { return this.handRenderer.getColorName(color); }
    public getColorHex(color: string): string { return this.handRenderer.getColorHex(color); }
    public getManaIcon(color: string): string { return this.manaRenderer.getManaIcon(color); }
    public getManaTooltipInfo(color: string): any { return this.manaRenderer.getManaTooltipInfo(color); }
    public getCombatPhaseName(phase: string): string { return this.combatUI.getCombatPhaseName(phase); }
    public getPhaseHint(phase: string): string { return this.combatUI.getPhaseHint(phase); }
    public getCardIcon(card: any): string { return this.handRenderer.getCardIcon(card); }
    public formatEffect(effect: any): string { return this.handRenderer.formatEffect(effect); }

    public reset(): void {
        this.notifications.clearLog();
        this.handRenderer.hidePlayArea();
        if (this.elements.handCards) this.elements.handCards.innerHTML = '';
        this.unitRenderer.reset();
        this.combatUI.reset();
        this.manaRenderer.reset();
        this.statsRenderer.reset();
    }

    public showLevelUpModal(newLevel: number, choices: any, onConfirm: (selection: any) => void): void {
        this.modals.showLevelUpModal(newLevel, choices, onConfirm);
    }

    public setupParticleSystem(gameCanvas: HTMLCanvasElement): any {
        const container = document.querySelector('.canvas-layer');
        if (!container) {
            console.warn('Canvas layer not found for particle system');
            return null;
        }
        this.particleCanvas = document.createElement('canvas');
        this.particleCanvas.width = gameCanvas.width;
        this.particleCanvas.height = gameCanvas.height;
        this.particleCanvas.style.position = 'absolute';
        this.particleCanvas.style.top = '0';
        this.particleCanvas.style.left = '0';
        this.particleCanvas.style.pointerEvents = 'none';
        this.particleCanvas.style.zIndex = '10';

        container.appendChild(this.particleCanvas);

        this.particleSystem = new ParticleSystem(this.particleCanvas);

        this.particleSystem.clearCanvas = () => {
            const ctx = this.particleCanvas?.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, this.particleCanvas!.width, this.particleCanvas!.height);
        };

        const originalUpdate = this.particleSystem.update.bind(this.particleSystem);
        this.particleSystem.update = () => {
            this.particleSystem.clearCanvas();
            originalUpdate();
        };

        return this.particleSystem;
    }

    public setupHelpSystem(abortController: AbortController): void {
        const signal = abortController.signal;
        const helpBtn = document.getElementById('help-btn');
        const helpModal = document.getElementById('help-modal');
        const helpClose = document.getElementById('help-close');
        const helpTabs = document.querySelectorAll('.help-tab');

        if (!helpBtn || !helpModal || !helpClose) return;

        helpBtn.addEventListener('click', () => helpModal.classList.add('active'), { signal });
        helpClose.addEventListener('click', () => helpModal.classList.remove('active'), { signal });
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) helpModal.classList.remove('active');
        }, { signal });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && helpModal.classList.contains('active')) {
                helpModal.classList.remove('active');
            }
        }, { signal });

        helpTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = (tab as HTMLElement).dataset.tab;
                helpTabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.help-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const targetContent = document.getElementById(`help-${targetTab}`);
                if (targetContent) targetContent.classList.add('active');
            }, { signal });
        });
    }
}

export default UI;
