import { runner } from './testRunner.js';
import { expect } from './test-utils.js';
import { MageKnightGame } from '../js/game.js';
import { Hero } from '../js/hero.js';
import { Combat } from '../js/combat.js';
import { Enemy } from '../js/enemy.js';
import { TutorialManager } from '../js/tutorialManager.js';
import { COMBAT_PHASES } from '../js/constants.js';
import { Card } from '../js/card.js';
import { resetMocks } from './test-mocks.js';
import './setup.js';

runner.test('Phase 3 Gaps: Combat Error Handling', () => {
    const hero = new Hero('TestHero');
    const enemies = [new Enemy('Orc', 3, 2, 2)];
    const combat = new Combat(hero, enemies);

    // Test blockPhase outside of BLOCK phase (line 149-151)
    combat.phase = COMBAT_PHASES.RANGED;
    const blockError = combat.blockPhase();
    expect(blockError.error).toBe('Nicht in der Block-Phase');

    // Test endBlockPhase outside of BLOCK phase
    const endBlockError = combat.endBlockPhase();
    expect(endBlockError.error).toBe('Nicht in der Block-Phase');

    // Test damagePhase outside of DAMAGE phase (line 210-211)
    combat.phase = COMBAT_PHASES.ATTACK;
    const damageError = combat.damagePhase();
    expect(damageError.error).toBe('Nicht in der Schadens-Phase');

    // Test attackPhase outside of ATTACK phase
    combat.phase = COMBAT_PHASES.BLOCK;
    const attackError = combat.attackPhase();
    expect(attackError.error).toBe('Nicht in der Angriffs-Phase');

    // Test rangedPhase outside of RANGED phase
    combat.phase = COMBAT_PHASES.ATTACK;
    const rangedError = combat.rangedPhase();
    expect(rangedError.error).toBe('Nicht in der Fernkampf-Phase');

    // Test endRangedPhase outside of RANGED phase
    const endRangedError = combat.endRangedPhase();
    expect(endRangedError.error).toBe('Nicht in der Fernkampf-Phase');
});

runner.test('Phase 3 Gaps: Hero Resource Constraints', () => {
    const hero = new Hero('Goldyx');
    hero.influencePoints = 0;

    // Test learnSpell with insufficient influence (line 411-412)
    const spell = new Card('Spell', 'blue', 1, { attack: 5 });
    const spellResult = hero.learnSpell(spell, 5);
    expect(spellResult.success).toBe(false);
    expect(spellResult.message).toBe('Nicht genug Einfluss.');

    // Test learnAdvancedAction with insufficient influence (line 424-425)
    const action = new Card('Action', 'red', 0, { movement: 3 });
    const actionResult = hero.learnAdvancedAction(action, 5);
    expect(actionResult.success).toBe(false);
    expect(actionResult.message).toBe('Nicht genug Einfluss.');

    // Test recruitUnit with insufficient influence
    const unit = { getName: () => 'Recruit' };
    const recruitResult = hero.recruitUnit(unit, 10);
    expect(recruitResult.success).toBe(false);
    expect(recruitResult.message).toBe('Nicht genug Einfluss.');

    // Test addUnit when command limit is reached (line 393)
    hero.commandLimit = 1;
    hero.units = ['ExistingUnit'];
    const addResult = hero.addUnit({ name: 'NewUnit' });
    expect(addResult).toBe(false);

    // Test recruitUnit when command limit reached
    hero.influencePoints = 100;
    const recruitLimitResult = hero.recruitUnit({ getName: () => 'Recruit' }, 5);
    expect(recruitLimitResult.success).toBe(false);
    expect(recruitLimitResult.message).toBe('Kein Platz für weitere Einheiten.');
});

runner.test('Phase 3 Gaps: TutorialManager UI and Logic', () => {
    resetMocks();
    const game = new MageKnightGame();
    const tutorial = new TutorialManager(game);

    // Test first time UI creation (line 37-72)
    tutorial.start();
    expect(tutorial.isActive).toBe(true);
    expect(document.getElementById('tutorial-overlay-custom')).toBeTruthy();

    // Test calling start when already active
    tutorial.start();

    // Test navigation logic
    const initialStep = tutorial.currentStep;
    tutorial.nextStep();
    expect(tutorial.currentStep).toBe(initialStep + 1);

    tutorial.prevStep();
    expect(tutorial.currentStep).toBe(initialStep);

    // Test showStep out of bounds (triggers complete)
    tutorial.showStep(999);
    expect(tutorial.isActive).toBe(false);

    // Restart for skip and complete tests
    tutorial.start();
    tutorial.skip();
    expect(tutorial.isActive).toBe(false);
    expect(localStorage.getItem('mageKnightTutorialCompleted')).toBe('true');

    // Static methods
    expect(TutorialManager.hasCompleted()).toBe(true);
    TutorialManager.reset();
    expect(TutorialManager.hasCompleted()).toBe(false);
});

runner.test('Phase 3 Gaps: Hero Level Up nuances', () => {
    const hero = new Hero('Goldyx');
    hero.fame = 9;

    // Level 1 to 2 needs 10 fame
    const result1 = hero.gainFame(1);
    expect(result1.leveledUp).toBe(true);
    expect(result1.newLevel).toBe(2);

    hero.levelUp(); // level 2
    expect(hero.level).toBe(2);
    expect(hero.handLimit).toBe(6); // even level increases handLimit

    const result2 = hero.gainFame(20); // 10 -> 30 (Level 3)
    expect(result2.leveledUp).toBe(true);
    expect(result2.newLevel).toBe(3);

    hero.levelUp(); // level 3
    expect(hero.level).toBe(3);
    expect(hero.commandLimit).toBe(2); // odd level increases commandLimit
    expect(hero.armor).toBe(3); // odd level increases armor
});
