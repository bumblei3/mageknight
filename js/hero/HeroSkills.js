/**
 * HeroSkills - Manages hero's skills and abilities
 */
export class HeroSkills {
    constructor(hero) {
        this.hero = hero; // Reference to parent hero for stat modifications
        this.skills = [];
        this.usedSkills = new Set();
    }

    hasSkill(skillId) {
        return this.skills.some(s => s.id === skillId);
    }

    canUseSkill(skillId) {
        const skill = this.skills.find(s => s.id === skillId);
        if (!skill || skill.type !== 'active') return false;
        return !this.usedSkills.has(skillId);
    }

    useSkill(skillId) {
        if (!this.canUseSkill(skillId)) return false;
        this.usedSkills.add(skillId);
        return true;
    }

    addSkill(skill) {
        this.skills.push(skill);

        // Apply passive effects immediately
        if (skill.id === 'dragon_scales' && this.hero) {
            this.hero.armor += 1;
        }
    }

    getSkills() {
        return [...this.skills];
    }

    resetUsedSkills() {
        this.usedSkills.clear();
    }

    // ========== State Persistence ==========

    getState() {
        return {
            skills: this.skills.map(s => ({ ...s })),
            usedSkills: Array.from(this.usedSkills)
        };
    }

    loadState(state) {
        if (!state) return;
        if (state.skills) this.skills = state.skills.map(s => ({ ...s }));
        if (state.usedSkills) this.usedSkills = new Set(state.usedSkills);
    }

    reset() {
        this.skills = [];
        this.usedSkills.clear();
    }
}
