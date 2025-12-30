# Code Coverage Analysis

## Overall Coverage

| Metric     | Coverage |
|------------|----------|
| Statements | **79.48%** |
| Branches   | **86.21%** |
| Functions  | **72.02%** |
| Lines      | **79.48%** |

---

## Coverage by Priority

### ✅ Excellent Coverage (90%+)
These modules are well-tested:
- **mapManager.js** - 100%
- **sites.js** - 100%
- **skills.js** - 100%
- **timeManager.js** - 100%
- **soundManager.js** - 100% (45% functions due to event listeners)
- **card.js** - 97.31%
- **enemy.js** - 97.17%
- **mana.js** - 96.44%
- **unit.js** - 96.75%
- **hexgrid.js** - 95.12%
- **tooltip.js** - 95.32%
- **saveManager.js** - 91.84%

### 🟨 Good Coverage (70-89%)
Decent but could be improved:
- **tutorialManager.js** - 82.96%
- **animator.js** - 75.82%
- **combat.js** - 79.94%
- **hero.js** - 79.01%
- **ui.js** - 73.52%
- **achievements.js** - 72.75%

### 🟧 Moderate Coverage (50-69%)
Need more tests:
- **siteInteraction.js** - 67.35%
- **statistics.js** - 65.97%
- **simpleTutorial.js** - 64.80%
- **enemyAI.js** - 61.32%
- **game.js** - 54.38% ⚠️ Core module!
- **touchController.js** - 13.33% ⚠️
- **combatAnimations.js** - 0% ⚠️ Not tested at all!

---

## Priority Testing Recommendations

### 🎯 High Priority
Focus on core game logic:

1. **game.js** (54.38% → Target: 85%+)
   - Missing: Save/load functionality (lines 1491-1501)
   - Missing: Level-up logic (lines 1508-1518)
   - Missing: Combat initiation (lines 1591-1634)
   
2. **combatAnimations.js** (0% → Target: 70%+)
   - Completely untested!
   - Visual animations - consider visual regression tests

3. **touchController.js** (13.33% → Target: 60%+)
   - Mobile interaction critical
   - Missing gesture tests

### 🎨 Medium Priority
Visual/UX enhancements:

4. **cardAnimations.js** (46.01% → Target: 70%+)
   - Animation state management
   - Missing: Draw animations, play effects

5. **particles.js** (46.71% → Target: 65%+)
   - Effect systems
   - Performance-critical code

6. **statistics.js** (65.97% → Target: 85%+)
   - Data tracking gaps
   - Missing: Export/analysis functions

### 📊 Low Priority
Well-covered core systems:

7. **hero.js** - Add edge case tests
8. **combat.js** - Cover complex combat scenarios
9. **ui.js** - Test UI state transitions

---

## Untested Code Patterns

### Animation Functions
Most animation modules have low coverage because:
- They rely on DOM manipulation
- Visual effects are hard to unit test
- Require browser integration tests

**Recommendation**: Add E2E tests with Playwright for visual validation

### Event Handlers
Many modules show low function coverage for:
- Mouse/touch event handlers
- Resize handlers
- Animation frame callbacks

**Recommendation**: Add integration tests that simulate events

### Error Paths
Branch coverage at 84.66% suggests some error handling is untested.

**Recommendation**: Add negative test cases (invalid inputs, edge cases)

---

## Next Steps

1. **Add tests for combatAnimations.js** - Currently 0%
2. **Improve game.js coverage** - Core logic at only 54%
3. **Test touchController.js** - Mobile support critical
4. **Create E2E tests** - For animation validation
5. **Set up CI with coverage gates** - Prevent regressions

## View Full Report

Open the HTML report:
```bash
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

This provides interactive, line-by-line coverage visualization.
