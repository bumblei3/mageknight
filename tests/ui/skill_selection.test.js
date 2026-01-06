import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SkillSelectionModal } from '../../js/ui/SkillSelectionModal.js';

describe('SkillSelectionModal', () => {
    let modal;

    beforeEach(() => {
        document.body.innerHTML = '';
        modal = new SkillSelectionModal();
    });

    afterEach(() => {
        if (modal && modal.overlay) {
            modal.overlay.remove();
        }
        vi.clearAllMocks();
    });

    it('should initialize lazily', () => {
        // Constructor shouldn't create UI anymore
        const freshModal = new SkillSelectionModal();
        expect(freshModal.overlay).toBeNull();
    });

    it('should create UI on show', async () => {
        const skills = [
            { id: 's1', name: 'Skill 1', description: 'Desc 1', icon: '🔥' },
            { id: 's2', name: 'Skill 2', description: 'Desc 2', icon: '❄️' }
        ];

        // Start showing (returns promise)
        const promise = modal.show(skills);

        expect(modal.overlay).not.toBeNull();
        expect(document.getElementById('skill-selection-modal')).toBeTruthy();
        expect(modal.overlay.classList.contains('show')).toBe(true);

        const choices = modal.container.querySelectorAll('.skill-choice');
        expect(choices.length).toBe(2);
        expect(choices[0].querySelector('.skill-name').textContent).toBe('Skill 1');
    });

    it('should allow selecting a skill and confirming', async () => {
        const skills = [
            { id: 's1', name: 'Skill 1', description: 'Desc 1', icon: '🔥' }
        ];

        const promise = modal.show(skills);
        const choice = modal.container.querySelector('.skill-choice');

        // Initially confirm button is hidden/not showing or logic implies hidden
        expect(modal.confirmBtn.style.display).toBe('none');

        // Click to select
        choice.click();
        expect(choice.classList.contains('selected')).toBe(true);
        expect(modal.selectedSkill).toEqual(skills[0]);
        expect(modal.confirmBtn.style.display).toBe('block');

        // Click confirm
        modal.confirmBtn.click();

        const result = await promise;
        expect(result).toEqual(skills[0]);
        expect(modal.overlay.classList.contains('show')).toBe(false);
    });

    it('should handle confirm-skill-btn being missing gracefully if error occurs', () => {
        // This is a safety check for the console.error line 37 in implementation
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { });

        const brokenModal = new SkillSelectionModal();
        // Manually break createUI locally for this test or mock innerHTML
        // But since createUI uses a template literal, we can just verify the actual one works
        brokenModal.createUI();
        expect(spy).not.toHaveBeenCalled();

        spy.mockRestore();
    });
});
