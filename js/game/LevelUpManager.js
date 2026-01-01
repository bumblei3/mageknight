import { getRandomSkills } from '../skills.js';
import { SAMPLE_ADVANCED_ACTIONS, Card } from '../card.js';

export class LevelUpManager {
    constructor(game) {
        this.game = game;
        this.modal = document.getElementById('level-up-modal');
        this.skillChoicesContainer = document.getElementById('skill-choices');
        this.cardChoicesContainer = document.getElementById('card-choices');
        this.confirmBtn = document.getElementById('confirm-level-up');
        this.selectedSkill = null;
        this.selectedCard = null;
        this.currentLevel = 0;
    }

    handleLevelUp(newLevelData) {
        this.currentLevel = newLevelData.newLevel;
        this.selectedSkill = null;
        this.selectedCard = null;

        // Display Level
        const levelDisplay = document.getElementById('new-level-display');
        if (levelDisplay) levelDisplay.textContent = this.currentLevel;

        // Visual Feedback
        if (this.game.particleSystem) {
            this.game.particleSystem.levelUpEffect(window.innerWidth / 2, window.innerHeight / 2);
        }

        // Generate Offers
        // 1. Skills (2 random)
        const currentSkillIds = this.game.hero.skills || [];
        const skillOffer = getRandomSkills('GOLDYX', 2, currentSkillIds);
        this.renderSkills(skillOffer);

        // 2. Advanced Actions (3 random)
        const currentCardIds = this.game.hero.deck.map(c => c.id);
        const cardOffer = this.getRandomCards(3, currentCardIds);
        this.renderCards(cardOffer);

        // Show Modal
        if (this.modal) {
            this.modal.style.display = 'flex';
        }

        this.updateConfirmButton();
        this.setupEventListeners();
    }

    getRandomCards(count, currentIds) {
        const available = SAMPLE_ADVANCED_ACTIONS.filter(c => !currentIds.includes(c.id));
        const shuffled = [...available].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    renderSkills(skills) {
        if (!this.skillChoicesContainer) return;
        this.skillChoicesContainer.innerHTML = '';
        skills.forEach(skill => {
            const el = document.createElement('div');
            el.className = 'choice-item skill-choice';
            el.innerHTML = `
                <div class="choice-icon">${skill.icon}</div>
                <div class="choice-name">${skill.name}</div>
                <div class="choice-desc">${skill.description}</div>
            `;
            el.onclick = () => this.selectSkill(skill, el);
            this.skillChoicesContainer.appendChild(el);
        });
    }

    renderCards(cards) {
        if (!this.cardChoicesContainer) return;
        this.cardChoicesContainer.innerHTML = '';
        cards.forEach(card => {
            const el = document.createElement('div');
            el.className = 'choice-item card-choice';
            el.innerHTML = `
                <div class="choice-icon" style="color: var(--color-mana-${card.color})">🎴</div>
                <div class="choice-name">${card.name}</div>
                <div class="choice-desc">${card.description}</div>
            `;
            el.onclick = () => this.selectCard(card, el);
            this.cardChoicesContainer.appendChild(el);
        });
    }

    selectSkill(skill, element) {
        this.selectedSkill = skill;
        Array.from(this.skillChoicesContainer.children).forEach(c => c.classList.remove('selected'));
        element.classList.add('selected');
        this.updateConfirmButton();
    }

    selectCard(card, element) {
        this.selectedCard = card;
        Array.from(this.cardChoicesContainer.children).forEach(c => c.classList.remove('selected'));
        element.classList.add('selected');
        this.updateConfirmButton();
    }

    updateConfirmButton() {
        if (!this.confirmBtn) return;
        if (this.selectedSkill && this.selectedCard) {
            this.confirmBtn.disabled = false;
        } else {
            this.confirmBtn.disabled = true;
        }
    }

    setupEventListeners() {
        if (this.confirmBtn) {
            this.confirmBtn.onclick = () => this.confirmSelection();
        }
    }

    confirmSelection() {
        if (!this.selectedSkill || !this.selectedCard) return;

        // Ensure Hero level is actually incremented
        this.game.hero.levelUp();

        // Apply choices
        this.game.hero.addSkill(this.selectedSkill);

        // Ensure we pass a Card instance, not just data
        const cardToAdd = this.selectedCard instanceof Card ? this.selectedCard : new Card(this.selectedCard);
        this.game.hero.addCardToDeck(cardToAdd);

        // Also apply passive level bonuses
        this.applyLevelBonuses();

        this.game.addLog(`Level Up! Gelernt: ${this.selectedSkill.name}`, 'success');
        this.game.addLog(`Neue Karte: ${this.selectedCard.name}`, 'success');

        // Close Modal
        if (this.modal) this.modal.style.display = 'none';

        // Reset confirmation
        if (this.confirmBtn) this.confirmBtn.onclick = null;

        // Update UI
        this.game.updateStats();
    }

    applyLevelBonuses() {
        // Stats are now handled in Hero.levelUp()
        // We just log the improvements for clarity
        if (this.currentLevel % 2 === 1) {
            this.game.addLog('Führungslimit erhöht (+1)', 'info');
        } else {
            this.game.addLog('Handkartenlimit erhöht (+1)', 'info');
        }
        // Armor also handled in Hero
    }
}
