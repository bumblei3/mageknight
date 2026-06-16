/**
 * Unified Button Component
 * Single source of truth for all buttons - a11y, shortcuts, loading states
 */
export interface ButtonProps {
    /** Button text or HTML */
    text?: string;
    html?: string;
    /** Visual variant */
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
    /** Size variant */
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Disabled state */
    disabled?: boolean;
    /** Loading spinner */
    loading?: boolean;
    /** Full width */
    block?: boolean;
    /** Icon (emoji or SVG) */
    icon?: string;
    /** Icon position */
    iconPosition?: 'left' | 'right';
    /** Keyboard shortcut hint */
    shortcut?: string;
    /** ARIA label for screen readers */
    ariaLabel?: string;
    /** Click handler */
    onClick?: (e: MouseEvent) => void;
    /** Additional CSS classes */
    className?: string;
    /** Element ID */
    id?: string;
    /** Type attribute */
    type?: 'button' | 'submit' | 'reset';
}

/** Creates a button element with unified styling and accessibility */
export function createButton(props: ButtonProps): HTMLButtonElement {
    const {
        text = '',
        html,
        variant = 'primary',
        size = 'md',
        disabled = false,
        loading = false,
        block = false,
        icon,
        iconPosition = 'left',
        shortcut,
        ariaLabel,
        onClick,
        className = '',
        id,
        type = 'button'
    } = props;

    const btn = document.createElement('button');
    btn.type = type;
    if (id) btn.id = id;
    if (ariaLabel) btn.setAttribute('aria-label', ariaLabel);
    if (disabled || loading) btn.disabled = true;
    if (onClick) btn.addEventListener('click', onClick);

    // Base classes
    const classes = [
        'mk-btn',
        `mk-btn--${variant}`,
        `mk-btn--${size}`,
        block ? 'mk-btn--block' : '',
        loading ? 'mk-btn--loading' : '',
        disabled ? 'mk-btn--disabled' : '',
        className
    ].filter(Boolean).join(' ');
    btn.className = classes;

    // Build content
    let content = '';
    
    // Loading spinner
    if (loading) {
        content += `<span class="mk-btn__spinner" aria-hidden="true"></span>`;
    } else if (icon && iconPosition === 'left') {
        content += `<span class="mk-btn__icon" aria-hidden="true">${icon}</span>`;
    }

    // Text content
    if (html) {
        content += html;
    } else if (text) {
        content += `<span class="mk-btn__text">${escapeHtml(text)}</span>`;
    }

    if (icon && iconPosition === 'right') {
        content += `<span class="mk-btn__icon" aria-hidden="true">${icon}</span>`;
    }

    // Shortcut hint
    if (shortcut && !disabled && !loading) {
        content += `<kbd class="mk-btn__shortcut" aria-hidden="true">${escapeHtml(shortcut)}</kbd>`;
    }

    btn.innerHTML = content;

    return btn;
}

/** Updates button state dynamically */
export function setButtonState(btn: HTMLButtonElement, state: Partial<{
    disabled: boolean;
    loading: boolean;
    text: string;
    variant: ButtonProps['variant'];
}>): void {
    if (state.disabled !== undefined) {
        btn.disabled = state.disabled;
        btn.classList.toggle('mk-btn--disabled', state.disabled);
    }
    if (state.loading !== undefined) {
        btn.disabled = state.loading || btn.disabled;
        btn.classList.toggle('mk-btn--loading', state.loading);
        // Refresh content to show/hide spinner
        if (state.loading) {
            btn.dataset.originalContent = btn.innerHTML;
            const variant = getVariant(btn);
            const size = getSize(btn);
            btn.innerHTML = `
                <span class="mk-btn__spinner" aria-hidden="true"></span>
                <span class="mk-btn__text">${btn.dataset.loadingText || 'Loading...'}</span>
            `;
        } else if (btn.dataset.originalContent) {
            btn.innerHTML = btn.dataset.originalContent;
            delete btn.dataset.originalContent;
        }
    }
    if (state.text !== undefined) {
        const textEl = btn.querySelector('.mk-btn__text');
        if (textEl) textEl.textContent = state.text;
    }
    if (state.variant !== undefined) {
        // Remove old variant classes
        btn.classList.remove('mk-btn--primary', 'mk-btn--secondary', 'mk-btn--danger', 'mk-btn--ghost', 'mk-btn--success');
        btn.classList.add(`mk-btn--${state.variant}`);
    }
}

function getVariant(btn: HTMLButtonElement): ButtonProps['variant'] {
    const match = btn.className.match(/mk-btn--(primary|secondary|danger|ghost|success)/);
    return (match?.[1] as ButtonProps['variant']) || 'primary';
}

function getSize(btn: HTMLButtonElement): ButtonProps['size'] {
    const match = btn.className.match(/mk-btn--(sm|md|lg|xl)/);
    return (match?.[1] as ButtonProps['size']) || 'md';
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/** Batch create common button patterns */
export const ButtonPatterns = {
    /** Primary action button (End Turn, Confirm, etc.) */
    primary: (text: string, onClick: () => void, shortcut?: string) =>
        createButton({ text, variant: 'primary', size: 'md', onClick, shortcut }),

    /** Secondary/alternative action */
    secondary: (text: string, onClick: () => void, shortcut?: string) =>
        createButton({ text, variant: 'secondary', size: 'md', onClick, shortcut }),

    /** Destructive action (Delete, Skip, etc.) */
    danger: (text: string, onClick: () => void, shortcut?: string) =>
        createButton({ text, variant: 'danger', size: 'md', onClick, shortcut }),

    /** Subtle action (Cancel, Back, etc.) */
    ghost: (text: string, onClick: () => void, shortcut?: string) =>
        createButton({ text, variant: 'ghost', size: 'md', onClick, shortcut }),

    /** Success/positive action (Heal, Recruit, Complete) */
    success: (text: string, onClick: () => void, shortcut?: string) =>
        createButton({ text, variant: 'success', size: 'md', onClick, shortcut }),

    /** Small icon-only button */
    icon: (icon: string, onClick: () => void, ariaLabel: string, variant: ButtonProps['variant'] = 'ghost', size: ButtonProps['size'] = 'sm') =>
        createButton({ icon, variant, size, onClick, ariaLabel }),

    /** Toggle button (pressed state via aria-pressed) */
    toggle: (text: string, pressed: boolean, onClick: () => void) => {
        const btn = createButton({ text, variant: pressed ? 'primary' : 'secondary', size: 'md', onClick });
        btn.setAttribute('aria-pressed', String(pressed));
        btn.addEventListener('click', () => btn.setAttribute('aria-pressed', String(!pressed)));
        return btn;
    },

    /** Button group container */
    group: (...buttons: HTMLButtonElement[]) => {
        const group = document.createElement('div');
        group.className = 'mk-btn-group';
        group.setAttribute('role', 'group');
        buttons.forEach(btn => group.appendChild(btn));
        return group;
    }
};