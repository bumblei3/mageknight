# Test Writing Guide

## Overview

This guide explains how to write tests for the Mage Knight game using our custom test runner.

## Test Structure

### Basic Test File

```javascript
import { describe, it, expect, beforeEach } from './testRunner.js';
import { MyModule } from '../js/myModule.js';

describe('MyModule', () => {
    let instance;
    
    beforeEach(() => {
        instance = new MyModule();
    });
    
    it('should do something', () => {
        const result = instance.doSomething();
        expect(result).toBe(true);
    });
});
```

## Available Assertions

### Equality
```javascript
expect(value).toBe(expected);           // Strict equality (===)
expect(value).toEqual(expected);        // Deep equality
expect(value).not.toBe(expected);       // Negation
```

### Truthiness
```javascript
expect(value).toBeTruthy();             // Truthy check
expect(value).toBeFalsy();              // Falsy check
expect(value).toBeDefined();            // Not undefined
expect(value).toBeUndefined();          // Is undefined
expect(value).toBeNull();               // Is null
```

### Comparisons
```javascript
expect(value).toBeGreaterThan(5);
expect(value).toBeGreaterThanOrEqual(5);
expect(value).toBeLessThan(10);
expect(value).toBeLessThanOrEqual(10);
```

### Strings
```javascript
expect(string).toContain('substring');
expect(string).toMatch(/pattern/);
```

### Arrays/Objects
```javascript
expect(array).toContain(item);
expect(array).toHaveLength(3);
expect(obj).toHaveProperty('key');
expect(obj).toHaveProperty('key', 'value');
```

### Functions
```javascript
expect(() => dangerous()).toThrow();
expect(() => dangerous()).toThrow('Error message');
```

## Using Mocks

### Import Shared Mocks

```javascript
import { 
    createMockDocument,
    createMockCanvas,
    createMockContext,
    createSpy
} from './test-mocks.js';
```

### Canvas Mocking

```javascript
it('should draw on canvas', () => {
    const canvas = createMockCanvas(800, 600);
    const ctx = canvas.getContext('2d');
    
    myDrawFunction(ctx);
    
    expect(ctx.fillRect.callCount).toBeGreaterThan(0);
});
```

### Spy Functions

```javascript
it('should call callback', () => {
    const callback = createSpy();
    
    myFunction(callback);
    
    expect(callback.callCount).toBe(1);
    expect(callback.calledWith('arg1', 'arg2')).toBe(true);
});
```

## Test Helpers

### Shared Test Utilities

Import from `test-helpers.js`:

```javascript
import {
    createTestGame,
    createTestHero,
    createTestEnemy,
    simulateCombat
} from './test-helpers.js';

it('should handle combat', () => {
    const game = createTestGame();
    const enemy = createTestEnemy('orc');
    
    simulateCombat(game, enemy);
    
    expect(enemy.armor).toBe(0);
});
```

## Best Practices

### 1. **One Concept Per Test**
```javascript
// ❌ Bad - Too many assertions
it('should handle everything', () => {
    expect(game.hero.armor).toBe(5);
    expect(game.enemies.length).toBe(3);
    expect(game.turnNumber).toBe(1);
});

// ✅ Good - Focused tests
it('should initialize hero with armor', () => {
    expect(game.hero.armor).toBe(5);
});

it('should spawn enemies', () => {
    expect(game.enemies.length).toBe(3);
});
```

### 2. **Descriptive Test Names**
```javascript
// ❌ Bad
it('test 1', () => { ... });

// ✅ Good
it('should reduce enemy armor when attacked', () => { ... });
```

### 3. **Use beforeEach for Setup**
```javascript
describe('Combat', () => {
    let game, hero, enemy;
    
    beforeEach(() => {
        game = createTestGame();
        hero = game.hero;
        enemy = createTestEnemy('orc');
    });
    
    it('should apply damage', () => {
        // Test uses clean state
    });
});
```

### 4. **Test Edge Cases**
```javascript
it('should handle zero damage', () => {
    enemy.takeDamage(0);
    expect(enemy.armor).toBe(3);
});

it('should handle negative damage', () => {
    enemy.takeDamage(-5);
    expect(enemy.armor).toBe(3);
});

it('should not reduce armor below zero', () => {
    enemy.takeDamage(100);
    expect(enemy.armor).toBe(0);
});
```

### 5. **Mock External Dependencies**
```javascript
// ❌ Bad - Depends on real DOM
it('should update UI', () => {
    updateDisplay();
    const element = document.getElementById('score');
    expect(element.textContent).toBe('100');
});

// ✅ Good - Uses mocks
it('should update UI', () => {
    const mockDoc = createMockDocument();
    const element = mockDoc.getElementById('score');
    
    updateDisplay(mockDoc);
    
    expect(element.textContent).toBe('100');
});
```

## Testing Async Code

```javascript
// Using async/await
it('should load game state', async () => {
    const state = await game.loadSave(0);
    expect(state).toBeDefined();
});

// Testing promises
it('should resolve promise', () => {
    return game.asyncOperation().then(result => {
        expect(result).toBe(true);
    });
});
```

## Coverage Guidelines

### Target Coverage
- **Statements**: 80%+
- **Branches**: 80%+
- **Functions**: 80%+
- **Lines**: 80%+

### What to Test
1. ✅ **Core game logic** - Always test
2. ✅ **Edge cases** - Important
3. ✅ **Error handling** - Critical
4. 🟨 **Getters/setters** - If complex
5. ❌ **Third-party libraries** - Skip
6. ❌ **Trivial code** - Not worth it

### What Not to Test
- Pure UI animations (use E2E instead)
- Third-party library internals
- Auto-generated code
- Trivial getters/setters

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (Node 20+)
npm run test:watch
```

## Example: Complete Test File

```javascript
import { describe, it, expect, beforeEach } from './testRunner.js';
import { Combat } from '../js/combat.js';
import { createTestHero, createTestEnemy } from './test-helpers.js';

describe('Combat System', () => {
    let combat, hero, enemy;
    
    beforeEach(() => {
        hero = createTestHero();
        enemy = createTestEnemy('orc');
        combat = new Combat(hero, enemy);
    });
    
    describe('initialization', () => {
        it('should create combat instance', () => {
            expect(combat).toBeDefined();
        });
        
        it('should set initial phase', () => {
            expect(combat.phase).toBe('block');
        });
    });
    
    describe('damage calculation', () => {
        it('should reduce armor before health', () => {
            combat.applyDamage(2);
            expect(enemy.armor).toBe(1);
            expect(enemy.health).toBe(3);
        });
        
        it('should handle overkill damage', () => {
            combat.applyDamage(10);
            expect(enemy.armor).toBe(0);
            expect(enemy.health).toBe(0);
        });
        
        it('should respect damage resistance', () => {
            enemy.resistance = { physical: 2 };
            combat.applyDamage(5);
            expect(enemy.armor).toBe(0);
        });
    });
});
```

## Tips for Better Tests

1. **Keep tests isolated** - No test should depend on another
2. **Use descriptive names** - Test name should explain what's being tested
3. **Test behavior, not implementation** - Focus on what, not how
4. **Keep tests simple** - Complex tests indicate complex code
5. **Run tests frequently** - Catch bugs early
6. **Maintain test quality** - Treat test code like production code

## Getting Help

- See [test-mocks.js](file:///home/tobber/.gemini/antigravity/scratch/mageknight/tests/test-mocks.js) for available mocks
- See [test-helpers.js](file:///home/tobber/.gemini/antigravity/scratch/mageknight/tests/test-helpers.js) for helper functions
- Check existing tests for patterns and examples
- Review [COVERAGE_ANALYSIS.md](file:///home/tobber/.gemini/antigravity/scratch/mageknight/COVERAGE_ANALYSIS.md) for gaps
