// Skill Renderer
import { store, ACTIONS } from '../game/Store';
import i18n from '../i18n/index';
const { t } = i18n as any;

/**
 * SkillRenderer
 * Renders the list of learned hero skills in the HUD.
 */
export class SkillRenderer {
    private ui: any;
    private container: HTMLElement | null = null;

    constructor(ui: any) {
        this.ui = ui;
        this.setupSubscriptions();
    }

    private setupSubscriptions(): void {
        if (!store) return;
        (store as any).subscribe((state: any, action: string) => {
            if (action === (ACTIONS as any).SET_HERO_STATS || action === (ACTIONS as any).SET_LANGUAGE) {
                this.render(state.hero);
            }
        });
    }

    public setContainer(element: HTMLElement | null): void {
        this.container = element;
    }

    public render(hero: any): void {
        if (!this.container || !hero || !hero.skills) return;
        this.container.innerHTML = '';

        if (hero.skills.length === 0) {
            this.container.innerHTML = `<div class="empty-skills">${t('ui.labels.noSkills')}</div>`;
            return;
        }

        (hero.skills as any[]).forEach(skill => {
            const isActive = skill.type === 'active';
            const isUsed = isActive && (hero.usedSkills instanceof Set ? hero.usedSkills.has(skill.id) : (hero.usedSkills as any[]).includes(skill.id));
            const typeClass = isActive ? 'active' : 'passive';
            const usedClass = isUsed ? 'used' : '';

            const skillEl = document.createElement('div');
            skillEl.className = `skill-item ${typeClass} ${usedClass}`;
            skillEl.dataset.skillId = skill.id;

            skillEl.innerHTML = `
                <span class="skill-icon">${skill.icon}</span>
                <span class="skill-name">${skill.name}</span>
                ${isActive ? `<span class="skill-status">${isUsed ? t('skills.used') : t('skills.ready')}</span>` : ''}
            `;

            // Tooltip data
            skillEl.dataset.tooltip = skill.description;
            skillEl.dataset.tooltipTitle = skill.name;

            // Add click handler for active skills
            if (isActive && !isUsed) {
                skillEl.onclick = () => this.handleSkillClick(skill.id, hero);
            }

            this.container!.appendChild(skillEl);

            // Register tooltip
            if (this.ui.tooltipManager) {
                this.ui.tooltipManager.register(skillEl, skill.description, skill.name);
            }
        });
    }

    public handleSkillClick(skillId: string, _hero: any): void {
        // Trigger skill effect via game controller
        if (this.ui.game && this.ui.game.heroController) {
            if (this.ui.game.sound) this.ui.game.sound.click();
            const result = this.ui.game.heroController.useActiveSkill(skillId);
            if (result.success) {
                this.ui.game.updateStats();
                this.ui.notifications.showToast(result.message, 'success');
            } else {
                this.ui.notifications.showToast(result.message, 'warning');
            }
        }
    }
}
