export class SkillSelectionModal {
    private overlay: HTMLElement | null = null;
    private container: HTMLElement | null = null;
    private confirmBtn: HTMLElement | null = null;
    private onSelect: ((skill: any) => void) | null = null;
    private selectedSkill: any = null;

    constructor() {
        this.overlay = null;
        this.onSelect = null;
    }

    private createUI(): void {
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

        // Append to body first to ensure it's in the document context if needed
        document.body.appendChild(this.overlay);

        this.container = this.overlay.querySelector('#skill-choices-container');
        this.confirmBtn = this.overlay.querySelector('#confirm-skill-btn');

        if (this.confirmBtn) {
            this.confirmBtn.onclick = () => this.handleConfirm();
        } else {
            console.error('SkillSelectionModal: confirm-skill-btn not found in innerHTML');
        }
    }

    public show(skills: any[]): Promise<any> {
        if (!this.overlay) this.createUI();
        return new Promise((resolve) => {
            this.onSelect = resolve;
            this.selectedSkill = null;
            this.renderSkills(skills);
            if (this.overlay) this.overlay.classList.add('show');
            if (this.confirmBtn) this.confirmBtn.style.display = 'none';
        });
    }

    private renderSkills(skills: any[]): void {
        if (!this.container) return;
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
            this.container!.appendChild(el);
        });
    }

    private selectSkill(skill: any, element: HTMLElement): void {
        this.selectedSkill = skill;

        // Update UI
        if (this.container) {
            this.container.querySelectorAll('.skill-choice').forEach(el => el.classList.remove('selected'));
        }
        element.classList.add('selected');

        if (this.confirmBtn) this.confirmBtn.style.display = 'block';
    }

    private handleConfirm(): void {
        if (this.selectedSkill && this.onSelect) {
            if (this.overlay) this.overlay.classList.remove('show');
            this.onSelect(this.selectedSkill);
            // Cleanup? Or keep for next time.
        }
    }
}
