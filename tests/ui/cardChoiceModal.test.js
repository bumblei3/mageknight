/**
 * The choice modal (Wish / Improvisation) must render every option with the
 * same weight. It reuses the site modal, whose default renderer promotes the
 * first option to a big "Empfohlen" CTA and hides the rest behind
 * "Weitere Aktionen" — wrong for a decision the player has to make.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModalManager } from '../../js/ui/ModalManager';

function makeModal() {
    document.body.innerHTML = `
        <div id="site-modal" class="modal">
            <span id="site-modal-icon"></span>
            <h2 id="site-modal-title"></h2>
            <p id="site-modal-description"></p>
            <div id="site-options"></div>
        </div>
    `;

    const elements = {
        siteModal: document.getElementById('site-modal'),
        siteModalIcon: document.getElementById('site-modal-icon'),
        siteModalTitle: document.getElementById('site-modal-title'),
        siteModalDescription: document.getElementById('site-modal-description'),
        siteOptions: document.getElementById('site-options')
    };

    const ui = { game: { sound: null }, showNotification: vi.fn() };
    return { modal: new ModalManager(elements, ui), elements, ui };
}

describe('ModalManager.showCardChoice', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('renders a flat list without a recommended primary', () => {
        const { modal, elements } = makeModal();

        modal.showCardChoice({
            icon: '🪄',
            title: 'Wunsch',
            description: 'Wähle einen Effekt',
            options: [
                { label: 'Heilen', action: vi.fn() },
                { label: 'Angriff', action: vi.fn() },
                { label: 'Artefakt', action: vi.fn() }
            ]
        });

        const buttons = elements.siteOptions.querySelectorAll('button');
        expect(buttons).toHaveLength(3);
        expect(elements.siteOptions.querySelector('.site-option-primary')).toBeNull();
        expect(elements.siteOptions.textContent).not.toContain('Empfohlen');
        expect(elements.siteOptions.textContent).not.toContain('Weitere Aktionen');
        expect(elements.siteModalTitle.textContent).toBe('Wunsch');
    });

    it('runs the action of the clicked option', () => {
        const { modal, elements } = makeModal();
        const heal = vi.fn(() => ({ success: true, message: 'geheilt' }));

        modal.showCardChoice({
            title: 'Wunsch',
            options: [
                { label: 'Heilen', action: heal },
                { label: 'Angriff', action: vi.fn() }
            ]
        });

        elements.siteOptions.querySelectorAll('button')[0].click();

        expect(heal).toHaveBeenCalled();
    });

    it('leaves the site modal ranking untouched for real site options', () => {
        const { modal, elements } = makeModal();

        modal.showSiteModal({
            icon: '🏘️',
            name: 'Dorf',
            description: 'Ein Dorf',
            options: [
                { label: 'Heilen', action: vi.fn() },
                { label: 'Rekrutieren', action: vi.fn() }
            ]
        });

        expect(elements.siteOptions.querySelector('.site-option-primary')).not.toBeNull();
    });
});
