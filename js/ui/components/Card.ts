/**
 * Card Component
 * Compact view for hand + Full preview modal on hover/long-press
 * Keyboard accessible, touch-friendly
 */

import { Card as CardClass } from '../../card';
import { t } from '../../i18n/index';

export interface CardData {
    id: string;
    name: string;
    color: string | null;
    type: string;
    basicEffect: any;
    strongEffect?: any;
    isWound?: () => boolean;
    canPlaySideways?: () => boolean;
    getEffect?: (strong: boolean) => any;
}

export interface CardProps {
    /** Card data */
    card: CardData | CardClass;
    /** Compact mode for hand */
    compact?: boolean;
    /** Show sideways indicator */
    showSideways?: boolean;
    /** Show mana cost badge */
    showManaCost?: boolean;
    /** Wound indicator */
    isWound?: boolean;
    /** Click handler */
    onClick?: (card: CardData, useStrong: boolean) => void;
    /** Right-click / long-press for preview */
    onPreview?: (card: CardData) => void;
    /** Keyboard select handler */
    onKeySelect?: (card: CardData, useStrong: boolean) => void;
    /** Custom CSS classes */
    className?: string;
    /** Element ID */
    id?: string;
    /** Disabled state */
    disabled?: boolean;
    /** Selected state */
    selected?: boolean;
    /** Show as played (in combat) */
    played?: boolean;
}

/** Creates a card element */
export function createCard(props: CardProps): HTMLElement {
    const {
        card,
        compact = true,
        showSideways = true,
        showManaCost = true,
        isWound = false,
        onClick,
        onPreview,
        onKeySelect,
        className = '',
        id,
        disabled = false,
        selected = false,
        played = false
    } = props;

    // Extract card data
    const cardData = card instanceof Object && 'getEffect' in card ? card : card as CardData;
    const name = cardData.name || 'Unknown';
    const color = cardData.color;
    const type = cardData.type || 'action';
    const basicEffect = cardData.basicEffect || {};
    const strongEffect = cardData.strongEffect;
    const canPlaySideways = cardData.canPlaySideways?.() ?? true;
    const wound = isWound || cardData.isWound?.();

    const wrapper = document.createElement('div');
    if (id) wrapper.id = id;
    
    const classes = [
        'mk-card',
        compact ? 'mk-card--compact' : 'mk-card--full',
        wound ? 'mk-card--wound' : '',
        color ? `mk-card--${color}` : '',
        played ? 'mk-card--played' : '',
        selected ? 'mk-card--selected' : '',
        disabled ? 'mk-card--disabled' : '',
        className
    ].filter(Boolean).join(' ');
    wrapper.className = classes;
    wrapper.setAttribute('role', 'button');
    wrapper.setAttribute('tabindex', disabled ? '-1' : '0');
    wrapper.setAttribute('aria-label', `${name}${wound ? ', Wunde' : ''}, ${type}${color ? `, ${color}` : ''}`);
    if (selected) wrapper.setAttribute('aria-pressed', 'true');

    // Build card content
    wrapper.innerHTML = buildCardHTML({
        name,
        color,
        type,
        basicEffect,
        strongEffect,
        wound: wound ?? false,
        canPlaySideways,
        showSideways: compact && showSideways && canPlaySideways && !(wound ?? false),
        showManaCost: compact && showManaCost && !(wound ?? false),
        played
    });

    // Event handlers
    if (!disabled) {
        // Click - play card (left) or strong (right)
        wrapper.addEventListener('click', (e) => {
            if (onClick) {
                const useStrong = e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey;
                onClick(cardData, useStrong);
            }
        });

        // Context menu / Long press for preview
        let pressTimer: number;
        const showPreview = (clientX: number, clientY: number) => {
            if (onPreview) onPreview(cardData);
        };

        // Mouse
        wrapper.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showPreview(e.clientX, e.clientY);
        });

        // Touch long press
        wrapper.addEventListener('touchstart', (e) => {
            pressTimer = window.setTimeout(() => {
                e.preventDefault(); // Prevent scroll
                const touch = e.touches[0];
                showPreview(touch.clientX, touch.clientY);
                // Haptic feedback
                if ('vibrate' in navigator) navigator.vibrate(10);
            }, 500);
        }, { passive: false });

        wrapper.addEventListener('touchend', () => clearTimeout(pressTimer));
        wrapper.addEventListener('touchmove', () => clearTimeout(pressTimer));

        // Keyboard
        wrapper.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (onClick) onClick(cardData, false); // Normal play
            } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.shiftKey)) {
                e.preventDefault();
                if (onClick) onClick(cardData, true); // Strong play
            } else if (e.key === ' ' && (e.ctrlKey || e.metaKey || e.shiftKey)) {
                e.preventDefault();
                if (onPreview) onPreview(cardData); // Preview modal
            } else if (onKeySelect) {
                onKeySelect(cardData, e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.shiftKey));
            }
        });

        // Hover preview (desktop only, after delay)
        if (!('ontouchstart' in window)) {
            let hoverTimer: number;
            wrapper.addEventListener('mouseenter', () => {
                hoverTimer = window.setTimeout(() => {
                    if (onPreview) onPreview(cardData);
                }, 800);
            });
            wrapper.addEventListener('mouseleave', () => clearTimeout(hoverTimer));
        }
    }

    return wrapper;
}

function buildCardHTML(params: {
    name: string;
    color: string | null;
    type: string;
    basicEffect: any;
    strongEffect?: any;
    wound: boolean;
    canPlaySideways: boolean;
    showSideways: boolean;
    showManaCost: boolean;
    played: boolean;
}): string {
    const { name, color, type, basicEffect, strongEffect, wound, canPlaySideways, showSideways, showManaCost, played } = params;

    if (wound) {
        return `
            <div class="mk-card__art mk-card__art--wound" aria-hidden="true">🩸</div>
            <div class="mk-card__name">Wunde</div>
            <div class="mk-card__type">Wunde</div>
            ${played ? '<div class="mk-card__played-badge">Gesetzt</div>' : ''}
        `;
    }

    const typeLabels: Record<string, string> = {
        action: 'Aktion',
        spell: 'Zauber',
        artifact: 'Artefakt',
        unit: 'Einheit',
        tactic: 'Taktik',
        wound: 'Wunde'
    };
    const typeLabel = typeLabels[type] || type;

    // Effect summary for compact view
    const effects = [];
    if (basicEffect.movement) effects.push(`⬆${basicEffect.movement}${strongEffect?.movement ? `+${strongEffect.movement}` : ''} Bewegung`);
    if (basicEffect.attack) effects.push(`⚔${basicEffect.attack}${strongEffect?.attack ? `+${strongEffect.attack}` : ''} Angriff`);
    if (basicEffect.block) effects.push(`🛡${basicEffect.block}${strongEffect?.block ? `+${strongEffect.block}` : ''} Block`);
    if (basicEffect.influence) effects.push(`💬${basicEffect.influence}${strongEffect?.influence ? `+${strongEffect.influence}` : ''} Einfluss`);
    if (basicEffect.healing) effects.push(`❤${basicEffect.healing}${strongEffect?.healing ? `+${strongEffect.healing}` : ''} Heilung`);
    if (basicEffect.mana) effects.push(`💎 Mana`);

    let html = '';

    // Mana cost badge (compact)
    if (showManaCost && color && color !== 'gold' && color !== 'black') {
        html += `<div class="mk-card__mana-cost mk-card__mana-cost--${color}" aria-label="${color} Mana">${getManaSymbol(color)}</div>`;
    } else if (showManaCost && (color === 'gold' || color === 'black')) {
        html += `<div class="mk-card__mana-cost mk-card__mana-cost--${color}" aria-label="${color} Mana">${color === 'gold' ? '★' : '◆'}</div>`;
    }

    // Art / Icon
    html += `<div class="mk-card__art" aria-hidden="true">${getCardArt(type, color)}</div>`;

    // Name
    html += `<div class="mk-card__name">${escapeHtml(name)}</div>`;

    // Type
    html += `<div class="mk-card__type">${typeLabel}</div>`;

    // Effects (compact)
    if (effects.length > 0) {
        html += `<div class="mk-card__effects">${effects.slice(0, 2).map(e => `<span class="mk-card__effect">${escapeHtml(e)}</span>`).join('')}</div>`;
    }

    // Sideways indicator
    if (showSideways && canPlaySideways) {
        html += `<div class="mk-card__sideways" title="Seitlich spielen (+1)" aria-label="Seitlich spielbar">↗</div>`;
    }

    // Played badge
    if (played) {
        html += `<div class="mk-card__played-badge">Gesetzt</div>`;
    }

    // Hover Tooltip (desktop only) - shows effects + shortcuts on card hover
    if (!wound && !played) {
        html += buildCardTooltip({ basicEffect, strongEffect, color });
    }

    return html;
}

const _effectIcons: Record<string, string> = {
    movement: '⬆',
    attack: '⚔',
    block: '🛡',
    influence: '💬',
    healing: '❤',
    mana: '💎'
};

const _effectNames: Record<string, string> = {
    movement: 'Bewegung',
    attack: 'Angriff',
    block: 'Block',
    influence: 'Einfluss',
    healing: 'Heilung',
    mana: 'Mana'
};

const _manaCostColors: Record<string, string> = {
    red: 'var(--color-mana-red)',
    blue: 'var(--color-mana-blue)',
    green: 'var(--color-mana-green)',
    white: 'var(--color-mana-white)',
    gold: 'var(--color-mana-gold)',
    black: 'var(--color-mana-black)'
};

function buildCardTooltip(params: { basicEffect: any; strongEffect?: any; color: string | null }): string {
    const { basicEffect, strongEffect, color } = params;
    if (!basicEffect || Object.keys(basicEffect).length === 0) return '';

    let tooltip = '<div class="card-tooltip"><div class="card-tooltip-content">';
    tooltip += `<div class="tooltip-title">Kartendetails</div>`;

    if (Object.keys(basicEffect).length > 0) {
        tooltip += '<div class="tooltip-section"><div class="tooltip-section-title">Basis</div>';
        Object.entries(basicEffect).forEach(([key, value]) => {
            if (value) {
                const strongVal = strongEffect?.[key];
                tooltip += `<div class="effect-row">
                    <span class="effect-label">${_effectIcons[key] || '•'} ${_effectNames[key] || key}</span>
                    <span class="effect-value">${value}${strongVal ? ` <span style="color:#3b82f6">(+${strongVal})</span>` : ''}</span>
                </div>`;
            }
        });
        tooltip += '</div>';
    }

    if (strongEffect && Object.keys(strongEffect).length > 0) {
        tooltip += '<div class="tooltip-section"><div class="tooltip-section-title">Stark (Mana)</div>';
        Object.entries(strongEffect).forEach(([key, value]) => {
            if (value) {
                tooltip += `<div class="effect-row">
                    <span class="effect-label">${_effectIcons[key] || '•'} ${_effectNames[key] || key}</span>
                    <span class="effect-value">${value}</span>
                </div>`;
            }
        });
        if (color) {
            tooltip += `<div class="effect-row">
                <span class="effect-label">Mana-Kosten</span>
                <span class="effect-value mana-cost" style="color: ${_manaCostColors[color] || 'var(--color-text-primary)'};">1 ${color.charAt(0).toUpperCase() + color.slice(1)}</span>
            </div>`;
        }
        tooltip += '</div>';
    }

    tooltip += '<div class="tooltip-section"><div class="tooltip-section-title">Aktionen</div>';
    tooltip += `<div class="effect-row"><span class="effect-label">Klick</span><span class="effect-value">Basis</span></div>`;
    if (strongEffect && Object.keys(strongEffect).length > 0) {
        tooltip += `<div class="effect-row"><span class="effect-label">Shift+Klick</span><span class="effect-value">Stark</span></div>`;
    }
    tooltip += `<div class="effect-row"><span class="effect-label">Rechtsklick</span><span class="effect-value">Seitlich (+1)</span></div>`;
    tooltip += '</div></div></div>';
    return tooltip;
}

function getManaSymbol(color: string): string {
    const symbols: Record<string, string> = {
        red: '●',
        blue: '▲',
        green: '■',
        white: '◆',
        gold: '★',
        black: '◆'
    };
    return symbols[color] || '?';
}

function getCardArt(type: string, color: string | null): string {
    const art: Record<string, string> = {
        action: '⚡',
        spell: '✨',
        artifact: '💎',
        unit: '👥',
        tactic: '📜',
        wound: '🩸'
    };
    return art[type] || '?';
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/** Card Preview Modal - shows full card details */
export interface CardPreviewOptions {
    card: CardData;
    onPlay?: (useStrong: boolean) => void;
    onClose?: () => void;
    onPlaySideways?: (effectType: string) => void;
}

let previewModal: HTMLElement | null = null;
let previewOverlay: HTMLElement | null = null;

export function showCardPreview(options: CardPreviewOptions): void {
    hideCardPreview();

    const { card, onPlay, onClose, onPlaySideways } = options;
    const name = card.name || 'Unknown';
    const color = card.color;
    const type = card.type || 'action';
    const basicEffect = card.basicEffect || {};
    const strongEffect = card.strongEffect;
    const canPlaySideways = card.canPlaySideways?.() ?? true;

    // Overlay
    previewOverlay = document.createElement('div');
    previewOverlay.className = 'mk-card-preview-overlay';
    previewOverlay.setAttribute('role', 'dialog');
    previewOverlay.setAttribute('aria-modal', 'true');
    previewOverlay.setAttribute('aria-labelledby', 'mk-card-preview-title');
    previewOverlay.style.cssText = `
        position: fixed; inset: 0; z-index: 10000;
        background: rgba(0, 0, 0, 0.7);
        display: flex; align-items: center; justify-content: center;
        padding: 20px; animation: mk-fade-in 0.15s ease;
    `;

    // Modal
    const modal = document.createElement('div');
    previewModal = modal;
    modal.className = 'mk-card-preview';
    modal.id = 'mk-card-preview-modal';
    modal.style.cssText = `
        background: #1f2937;
        border: 2px solid ${color ? getColorBorder(color) : '#3b82f6'};
        border-radius: 16px;
        max-width: 400px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        animation: mk-slide-up 0.2s ease;
    `;

    modal.innerHTML = buildPreviewHTML({
        name, color, type, basicEffect, strongEffect, canPlaySideways
    });

    // Event handlers
    const close = () => {
        if (onClose) onClose();
        hideCardPreview();
    };

    // Close on overlay click
    previewOverlay.addEventListener('click', (e) => {
        if (e.target === previewOverlay) close();
    });

    // Close on Escape
    const keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', keyHandler);

    // Buttons
    modal.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            if (action === 'play') {
                close();
                if (onPlay) onPlay(false);
            } else if (action === 'play-strong') {
                close();
                if (onPlay) onPlay(true);
            } else if (action === 'play-sideways') {
                const effectType = btn.getAttribute('data-effect');
                close();
                if (onPlaySideways && effectType) onPlaySideways(effectType);
            } else if (action === 'close') {
                close();
            }
        });
    });

    previewOverlay.appendChild(modal);
    document.body.appendChild(previewOverlay);

    // Focus first focusable element
    setTimeout(() => {
        const firstBtn = modal.querySelector('button') as HTMLElement;
        firstBtn?.focus();
    }, 50);

    // Cleanup on hide
    const doHide = () => {
        document.removeEventListener('keydown', keyHandler);
        if (previewOverlay?.parentNode) previewOverlay.parentNode.removeChild(previewOverlay);
        previewOverlay = null;
        previewModal = null;
    };
    
    // Temporarily override hideCardPreview for this preview
    const originalHide = hideCardPreview;
    let hideOverride = true;
    const hideWithCleanup = () => {
        if (!hideOverride) return originalHide();
        doHide();
        hideOverride = false;
    };
    
    // Monkey-patch for this session
    (window as any).__hideCardPreviewOverride = hideWithCleanup;
    
    // Restore on next show
    const originalShow = showCardPreview;
    (window as any).showCardPreview = (options: any) => {
        delete (window as any).__hideCardPreviewOverride;
        delete (window as any).showCardPreview;
        return originalShow(options);
    };
}

export function hideCardPreview(): void {
    if (previewOverlay?.parentNode) {
        previewOverlay.parentNode.removeChild(previewOverlay);
    }
    previewOverlay = null;
    previewModal = null;
}

function buildPreviewHTML(params: {
    name: string;
    color: string | null;
    type: string;
    basicEffect: any;
    strongEffect?: any;
    canPlaySideways: boolean;
}): string {
    const { name, color, type, basicEffect, strongEffect, canPlaySideways } = params;

    const typeLabels: Record<string, string> = {
        action: 'Aktion',
        spell: 'Zauber',
        artifact: 'Artefakt',
        unit: 'Einheit',
        tactic: 'Taktik',
        wound: 'Wunde'
    };

    let html = '';

    // Header with color bar
    html += `<div class="mk-card-preview__header" style="background: ${color ? getColorBorder(color) : '#3b82f6'}; border-radius: 14px 14px 0 0; padding: 16px 20px;">
        <h2 id="mk-card-preview-title" style="margin: 0; color: white; font-size: 1.25rem;">${escapeHtml(name)}</h2>
        <div style="font-size: 0.8rem; opacity: 0.9;">${typeLabels[type] || type}${color ? ` • ${color}` : ''}</div>
    </div>`;

    // Effects
    html += '<div class="mk-card-preview__effects" style="padding: 20px;">';
    
    if (Object.keys(basicEffect).length > 0) {
        html += '<h3 style="margin: 0 0 12px; font-size: 0.9rem; color: #9ca3af; text-transform: uppercase;">Basiseffekt</h3>';
        html += '<div class="mk-card-preview__effect-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px;">';
        
        const effectIcons: Record<string, string> = {
            movement: '⬆',
            attack: '⚔',
            block: '🛡',
            influence: '💬',
            healing: '❤',
            mana: '💎'
        };

        const effectNames: Record<string, string> = {
            movement: 'Bewegung',
            attack: 'Angriff',
            block: 'Block',
            influence: 'Einfluss',
            healing: 'Heilung',
            mana: 'Mana'
        };

        Object.entries(basicEffect).forEach(([key, value]) => {
            if (value) {
                const strongVal = strongEffect?.[key];
                html += `
                    <div style="background: #374151; border-radius: 8px; padding: 12px; text-align: center;">
                        <div style="font-size: 1.5rem;">${effectIcons[key] || '•'}</div>
                        <div style="font-weight: 600; color: white;">${value}${strongVal ? ` <span style="color:#3b82f6">(+${strongVal})</span>` : ''}</div>
                        <div style="font-size: 0.7rem; color: #9ca3af;">${effectNames[key] || key}</div>
                    </div>
                `;
            }
        });
        html += '</div>';
    }

    // Strong effect
    if (strongEffect && Object.keys(strongEffect).length > 0) {
        html += '<h3 style="margin: 20px 0 12px; font-size: 0.9rem; color: #9ca3af; text-transform: uppercase;">Starker Effekt (Mana)</h3>';
        html += '<div class="mk-card-preview__effect-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px;">';
        Object.entries(strongEffect).forEach(([key, value]) => {
            if (value) {
                const effectIcons: Record<string, string> = {
                    movement: '⬆',
                    attack: '⚔',
                    block: '🛡',
                    influence: '💬',
                    healing: '❤',
                    mana: '💎'
                };
                html += `
                    <div style="background: #1e3a5f; border: 1px solid #3b82f6; border-radius: 8px; padding: 12px; text-align: center;">
                        <div style="font-size: 1.5rem;">${effectIcons[key] || '•'}</div>
                        <div style="font-weight: 600; color: #60a5fa;">${value}</div>
                        <div style="font-size: 0.7rem; color: #9ca3af;">${key}</div>
                    </div>
                `;
            }
        });
        html += '</div>';
    }

    // Sideways
    if (canPlaySideways) {
        html += `
            <div style="margin-top: 20px; padding: 16px; background: #374151; border-radius: 12px; border-left: 4px solid #fbbf24;">
                <div style="font-weight: 600; color: #fbbf24; margin-bottom: 8px;">↗ Seitlich spielen</div>
                <div style="font-size: 0.85rem; color: #d1d5db;">Wähle einen Bonus (+1):</div>
                <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
                    ${['movement', 'attack', 'block', 'influence'].map(k => `
                        <button data-action="play-sideways" data-effect="${k}" style="flex: 1; min-width: 80px; padding: 8px 12px; background: #1f2937; border: 1px solid #4b5563; border-radius: 8px; color: white; font-size: 0.8rem; cursor: pointer; transition: all 0.15s;">
                            ${getEffectIcon(k)} ${k.charAt(0).toUpperCase() + k.slice(1)}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    html += '</div>';

    // Action buttons
    html += `
        <div class="mk-card-preview__actions" style="display: flex; gap: 12px; padding: 16px 20px 20px; border-top: 1px solid #374151; flex-wrap: wrap;">
            <button data-action="play" style="flex: 1; min-width: 100px; padding: 12px 20px; background: #3b82f6; border: none; border-radius: 10px; color: white; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: background 0.15s;">Spielen</button>
            ${strongEffect && Object.keys(strongEffect).length > 0 ? `
                <button data-action="play-strong" style="flex: 1; min-width: 100px; padding: 12px 20px; background: #1e3a5f; border: 2px solid #3b82f6; border-radius: 10px; color: #60a5fa; font-weight: 600; font-size: 0.95rem; cursor: pointer;">Stark (Mana)</button>
            ` : ''}
            <button data-action="close" style="padding: 12px 20px; background: transparent; border: 1px solid #4b5563; border-radius: 10px; color: #d1d5db; font-weight: 600; font-size: 0.95rem; cursor: pointer;">Schließen</button>
        </div>
    `;

    return html;
}

function getColorBorder(color: string | null): string {
    const colors: Record<string, string> = {
        red: '#ef4444',
        blue: '#3b82f6',
        green: '#10b981',
        white: '#f9fafb',
        gold: '#fbbf24',
        black: '#374151'
    };
    return colors[color || ''] || '#3b82f6';
}

function getEffectIcon(key: string): string {
    const icons: Record<string, string> = {
        movement: '⬆',
        attack: '⚔',
        block: '🛡',
        influence: '💬',
        healing: '❤',
        mana: '💎'
    };
    return icons[key] || '•';
}

/** Inject preview styles once */
let previewStylesInjected = false;
export function injectCardPreviewStyles(): void {
    if (previewStylesInjected) return;
    previewStylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes mk-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes mk-slide-up {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .mk-card-preview__effect-grid button {
            transition: all 0.15s;
        }
        .mk-card-preview__effect-grid button:hover {
            background: #374151 !important;
            border-color: #3b82f6 !important;
            transform: translateY(-2px);
        }
        .mk-card-preview__actions button:hover {
            filter: brightness(1.1);
            transform: translateY(-1px);
        }
        .mk-card-preview__actions button[data-action="close"]:hover {
            background: #374151 !important;
            border-color: #6b7280 !important;
        }
    `;
    document.head.appendChild(style);
}