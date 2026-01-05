
export class SkillSelectionModal {
    constructor() {
        this.overlay = null;
        this.onSelect = null;
        this.createUI();
    }

    createUI() {
        // Create modal structure
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal';
        this.overlay.id = 'skill-selection-modal';

        this.overlay.innerHTML = `
            <div class="modal-content level-up-content">
                <div class="level-up-message">Level Aufstieg!</div>
                <div class="level-up-section">
                    <h3>Wähle einen neuen Skill</h3>
                    <div class="choices-grid" id="skill-choices-container">
                        <!-- Skills injected here -->
                    </div>
                </div>
                <button id="confirm-skill-btn" class="btn btn-primary btn-large" style="display:none; margin: 2rem auto;">Wählen</button>
            </div>
        `;

        document.body.appendChild(this.overlay);

        this.container = this.overlay.querySelector('#skill-choices-container');
        this.confirmBtn = this.overlay.querySelector('#confirm-skill-btn');

        this.confirmBtn.onclick = () => this.handleConfirm();
    }

    show(skills) {
        return new Promise((resolve) => {
            this.onSelect = resolve;
            this.selectedSkill = null;
            this.renderSkills(skills);
            this.overlay.classList.add('show');
            this.confirmBtn.style.display = 'none';
        });
    }

    renderSkills(skills) {
        this.container.innerHTML = '';

        skills.forEach(skill => {
            const el = document.createElement('div');
            el.className = 'skill-choice';
            el.innerHTML = `
                <div class="skill-icon">${skill.icon}</div>
                <div class="skill-name">${skill.name}</div>
                <div class="skill-description">${skill.description}</div>
            `;

            el.onclick = () => this.selectSkill(skill, el);
            this.container.appendChild(el);
        });
    }

    selectSkill(skill, element) {
        this.selectedSkill = skill;

        // Update UI
        this.container.querySelectorAll('.skill-choice').forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');

        this.confirmBtn.style.display = 'block';
    }

    handleConfirm() {
        if (this.selectedSkill && this.onSelect) {
            this.overlay.classList.remove('show');
            this.onSelect(this.selectedSkill);
            // Cleanup? Or keep for next time.
        }
    }
}
