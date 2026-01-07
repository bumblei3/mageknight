/**
 * HeroSkills - Manages hero's skills and abilities
 */

export interface Skill {
    id: string;
    name: string;
    description: string;
    icon: string;
    type: 'passive' | 'active';
}

export class HeroSkills {
    public hero: any; // Reference to parent hero for stat modifications
    public skills: Skill[] = [];
    public usedSkills: Set<string> = new Set();

    constructor(hero: any) {
        this.hero = hero;
    }

    public hasSkill(skillId: string): boolean {
        return this.skills.some(s => s.id === skillId);
    }

    public canUseSkill(skillId: string): boolean {
        const skill = this.skills.find(s => s.id === skillId);
        if (!skill || skill.type !== 'active') return false;
        return !this.usedSkills.has(skillId);
    }

    public useSkill(skillId: string): boolean {
        if (!this.canUseSkill(skillId)) return false;
        this.usedSkills.add(skillId);
        return true;
    }

    public addSkill(skill: Skill): void {
        this.skills.push(skill);

        // Apply passive effects immediately
        if (skill.id === 'dragon_scales' && this.hero) {
            this.hero.armor += 1;
        }
    }

    public getSkills(): Skill[] {
        return [...this.skills];
    }

    public resetUsedSkills(): void {
        this.usedSkills.clear();
    }

    // ========== State Persistence ==========

    public getState(): { skills: Skill[], usedSkills: string[] } {
        return {
            skills: this.skills.map(s => ({ ...s })),
            usedSkills: Array.from(this.usedSkills)
        };
    }

    public loadState(state: any): void {
        if (!state) return;
        if (state.skills) this.skills = state.skills.map((s: any) => ({ ...s }));
        if (state.usedSkills) this.usedSkills = new Set(state.usedSkills);
    }

    public reset(): void {
        this.skills = [];
        this.usedSkills.clear();
    }
}
