// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModalManager } from '../../js/ui/ModalManager.js';

// Build a minimal DOM that mirrors the elements ModalManager expects.
// This is real DOM (jsdom) — catches UI wiring bugs that game-logic
// unit tests cannot (e.g. modal class toggling, option click handlers).
function buildElements() {
    const make = (id, cls) => {
        const el = document.createElement('div');
        if (id) el.id = id;
        if (cls) el.className = cls;
        document.body.appendChild(el);
        return el;
    };
    return {
        siteModal: make('siteModal'),
        siteModalIcon: make('siteModalIcon'),
        siteModalTitle: make('siteModalTitle'),
        siteModalDescription: make('siteModalDescription'),
        siteOptions: make('siteOptions'),
        levelUpModal: make('levelUpModal'),
        newLevelDisplay: make('newLevelDisplay'),
        skillChoices: make('skillChoices'),
        cardChoices: make('cardChoices'),
        confirmLevelUpBtn: make('confirmLevelUpBtn', 'btn'),
    };
}

const makeUI = () => ({
    game: { sound: { click: vi.fn(), levelUp: vi.fn() } },
    showNotification: vi.fn(),
    showToast: vi.fn(),
    createCardElement: (card) => {
        const el = document.createElement('div');
        el.className = 'mk-card';
        el.dataset.cardId = card.id;
        return el;
    },
});

describe('ModalManager (real DOM, jsdom)', () => {
    let elements;
    let ui;
    let mgr;

    beforeEach(() => {
        document.body.innerHTML = '';
        elements = buildElements();
        ui = makeUI();
        mgr = new ModalManager(elements, ui);
    });

    describe('site modal', () => {
        it('shows the modal with title/icon/description and the show class', () => {
            mgr.showSiteModal({
                name: 'Dungeon',
                icon: 'dungeon',
                color: '#374151',
                description: 'Ein feuchter Kerker.',
                options: [],
            });
            expect(elements.siteModal.classList.contains('show')).toBe(true);
            expect(elements.siteModalTitle.textContent).toBe('Dungeon');
            // jsdom normalizes #374151 -> rgb(55, 65, 81)
            expect(elements.siteModalTitle.style.color).toBe('rgb(55, 65, 81)');
            expect(elements.siteModalIcon.textContent).toBe('dungeon');
            expect(elements.siteModalDescription.textContent).toBe('Ein feuchter Kerker.');
        });

        it('renders a simple action button and runs it on click', () => {
            const action = vi.fn(() => ({ success: true, message: 'Erledigt!' }));
            mgr.showSiteModal({
                name: 'Kloster',
                icon: '⛪',
                color: '#f87171',
                description: '',
                options: [{ id: 'heal', label: 'Heilen', enabled: true, action }],
            });
            const btn = elements.siteOptions.querySelector('button');
            expect(btn).not.toBeNull();
            expect(btn.disabled).toBe(false);
            btn.click();
            expect(action).toHaveBeenCalledTimes(1);
            expect(ui.showNotification).toHaveBeenCalledWith('Erledigt!', 'success');
            // success closes the modal
            expect(elements.siteModal.classList.contains('show')).toBe(false);
        });

        it('does NOT close on a failed action and shows an error toast', () => {
            const action = vi.fn(() => ({ success: false, message: 'Zu teuer.' }));
            mgr.showSiteModal({
                name: 'Burg',
                icon: '🏰',
                color: '#9ca3af',
                description: '',
                options: [{ id: 'recruit', label: 'Rekrutieren', enabled: true, action }],
            });
            elements.siteOptions.querySelector('button').click();
            expect(action).toHaveBeenCalledTimes(1);
            expect(ui.showNotification).toHaveBeenCalledWith('Zu teuer.', 'error');
            expect(elements.siteModal.classList.contains('show')).toBe(true);
        });

        it('hides the modal by removing the show class', () => {
            mgr.showSiteModal({ name: 'X', icon: 'y', options: [] });
            expect(elements.siteModal.classList.contains('show')).toBe(true);
            mgr.hideSiteModal();
            expect(elements.siteModal.classList.contains('show')).toBe(false);
        });
    });

    describe('level-up modal', () => {
        const skills = [
            { id: 's1', name: 'Blutrausch', icon: '🩸', description: '+' },
            { id: 's2', name: 'Taktik', icon: '🎯', description: '+' },
        ];
        const cards = [{ id: 'c1', name: 'Fireball' }, { id: 'c2', name: 'Heal' }];

        it('renders skills + cards and keeps confirm disabled until both chosen', () => {
            const onConfirm = vi.fn();
            mgr.showLevelUpModal(3, { skills, cards }, onConfirm);
            expect(elements.newLevelDisplay.textContent).toBe('3');
            expect(elements.skillChoices.children.length).toBe(2);
            expect(elements.cardChoices.children.length).toBe(2);
            expect(elements.confirmLevelUpBtn.disabled).toBe(true);

            // pick a skill only -> still disabled
            elements.skillChoices.children[0].click();
            expect(elements.confirmLevelUpBtn.disabled).toBe(true);

            // pick a card too -> enabled
            elements.cardChoices.children[0].click();
            expect(elements.confirmLevelUpBtn.disabled).toBe(false);

            // confirm -> onConfirm with the selection
            elements.confirmLevelUpBtn.click();
            expect(onConfirm).toHaveBeenCalledTimes(1);
            expect(onConfirm.mock.calls[0][0]).toEqual({ skill: skills[0], card: cards[0] });
            expect(elements.levelUpModal.style.display).toBe('none');
        });

        it('replaces the confirm button (no duplicate listeners across calls)', () => {
            const onConfirm1 = vi.fn();
            const onConfirm2 = vi.fn();
            mgr.showLevelUpModal(2, { skills, cards }, onConfirm1);
            elements.skillChoices.children[0].click();
            elements.cardChoices.children[0].click();
            elements.confirmLevelUpBtn.click();
            expect(onConfirm1).toHaveBeenCalledTimes(1);

            mgr.showLevelUpModal(3, { skills, cards }, onConfirm2);
            elements.skillChoices.children[0].click();
            elements.cardChoices.children[0].click();
            elements.confirmLevelUpBtn.click();
            expect(onConfirm2).toHaveBeenCalledTimes(1);
            expect(onConfirm1).toHaveBeenCalledTimes(1); // not called again
        });
    });
});
