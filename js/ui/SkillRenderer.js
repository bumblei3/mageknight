// Skill Renderer
// Manages the display and interaction of Hero Skills in the HUD

export class SkillRenderer {
    constructor(ui) {
        this.ui = ui;
        this.container = null;
    }

    setContainer(container) {
        this.container = container;
    }

    render(hero) {
        if (!this.container || !hero) return;

        // Create skills list
        this.container.innerHTML = `
            <div class="skills-header">Skills</div>
            <div class="skills-list">
                ${hero.skills.length === 0 ? '<div class="no-skills">Keine Skills</div>' : ''}
                ${hero.skills.map(skill => this.renderSkill(skill, hero)).join('')}
            </div>
        `;

        // Add event listeners for active skills
        this.container.querySelectorAll('.skill-item.active:not(.used)').forEach(el => {
            el.addEventListener('click', () => {
                const skillId = el.dataset.skillId;
                this.handleSkillClick(skillId, hero);
            });
        });
    }

    renderSkill(skill, hero) {
        const isActive = skill.type === 'active';
        const isUsed = isActive && hero.usedSkills.has(skill.id);
        const typeClass = isActive ? 'active' : 'passive';
        const usedClass = isUsed ? 'used' : '';

        return `
            <div class="skill-item ${typeClass} ${usedClass}" 
                 data-skill-id="${skill.id}" 
                 title="${skill.description}">
                <span class="skill-icon">${skill.icon}</span>
                <span class="skill-name">${skill.name}</span>
                ${isActive ? `<span class="skill-status">${isUsed ? 'Benutzt' : 'Bereit'}</span>` : ''}
            </div>
        `;
    }

    handleSkillClick(skillId, hero) {
        // Trigger skill effect via game controller
        if (this.ui.game && this.ui.game.heroController) {
            const result = this.ui.game.heroController.useActiveSkill(skillId);
            if (result.success) {
                this.ui.game.updateStats();
                this.ui.showToast(result.message, 'success');
            } else {
                this.ui.showToast(result.message, 'warning');
            }
        }
    }
}
