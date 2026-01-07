import { t } from '../i18n/index';
import { store, ACTIONS } from '../game/Store';
import { UIElements } from '../ui';

export class UnitRenderer {
    private elements: UIElements;
    private ui: any;

    constructor(elements: UIElements, ui: any) {
        this.elements = elements;
        this.ui = ui;
        this.setupSubscriptions();
    }

    private setupSubscriptions(): void {
        if (!store) return;
        (store as any).subscribe((state: any, action: string) => {
            if (action === (ACTIONS as any).SET_HERO_STATS || action === (ACTIONS as any).SET_LANGUAGE) {
                this.renderUnits(state.hero.units);
            }
        });
    }

    /**
     * Render units in hero panel
     * @param {any[]} units - List of unit objects
     */
    public renderUnits(units: any[]): void {
        if (!this.elements.heroUnits) return;

        this.elements.heroUnits.innerHTML = '';

        if (!units || units.length === 0) {
            this.elements.heroUnits.innerHTML = `<div style="text-align: center; color: #6b7280; padding: 1rem; font-size: 0.9rem;">${(t as any)('ui.labels.noUnits')}</div>`;
            return;
        }

        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '1fr';
        grid.style.gap = '0.5rem';

        units.forEach(unit => {
            const unitCard = document.createElement('div');
            unitCard.className = 'unit-card';
            unitCard.style.padding = '0.75rem';
            unitCard.style.background = 'rgba(59, 130, 246, 0.1)';
            unitCard.style.border = '2px solid rgba(59, 130, 246, 0.3)';
            unitCard.style.borderRadius = '6px';
            unitCard.style.transition = 'all 0.2s';

            // Status-based styling (with defensive checks for mock units)
            const isReady = typeof unit.isReady === 'function' ? unit.isReady() : (unit.isReady !== undefined ? unit.isReady : true);
            const unitWounds = unit.wounds || 0;
            if (!isReady) {
                unitCard.style.opacity = '0.6';
                unitCard.style.filter = 'grayscale(0.5)';
                unitCard.style.borderColor = 'rgba(107, 114, 128, 0.3)';
            } else if (unitWounds > 0) {
                unitCard.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            } else {
                unitCard.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            }

            // Build abilities text (with defensive check)
            const abilities = typeof unit.getAbilities === 'function' ? unit.getAbilities() : [];
            const abilityText = (abilities as any[]).map(a => a.text).join(' • ');

            const unitIcon = typeof unit.getIcon === 'function' ? unit.getIcon() : (unit.icon || '🎖️');
            const unitName = typeof unit.getName === 'function' ? unit.getName() : (unit.name || 'Unit');
            const unitLevel = unit.level || 1;
            const unitArmor = unit.armor || 0;
            const unitResistances = unit.resistances || [];

            unitCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.5rem;">${unitIcon}</span>
                        <div>
                            <div style="font-weight: 600; color: #e2e8f0;">${unitName}</div>
                            <div style="font-size: 0.75rem; color: #94a3b8;">Level ${unitLevel}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8rem; color: ${isReady ? '#10b981' : '#6b7280'};">
                            ${isReady ? '✓ ' + (t as any)('ui.labels.ready') : '○ ' + (t as any)('ui.labels.exhausted')}
                        </div>
                        ${unitWounds > 0 ? `<div style="font-size: 0.8rem; color: #ef4444;">💔 ${unitWounds} ${(t as any)('ui.labels.wounds')}</div>` : ''}
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem;">
                    ${abilityText}
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; font-size: 0.8rem;">
                    <span title="Armor">🛡️ ${unitArmor}</span>
                    ${unitResistances.length > 0 ? `<span title="Resistances">🔰 ${(unitResistances as string[]).join(', ')}</span>` : ''}
                </div>
            `;

            // Hover effects
            unitCard.addEventListener('mouseenter', () => {
                unitCard.style.transform = 'translateY(-2px)';
                unitCard.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                if (this.ui && this.ui.game && this.ui.game.sound) {
                    this.ui.game.sound.hover();
                }
            });
            unitCard.addEventListener('mouseleave', () => {
                unitCard.style.transform = 'translateY(0)';
                unitCard.style.boxShadow = 'none';
            });

            grid.appendChild(unitCard);
        });

        this.elements.heroUnits.appendChild(grid);
    }

    /**
     * Reset unit display
     */
    public reset(): void {
        if (this.elements.heroUnits) this.elements.heroUnits.innerHTML = '';
    }
}
