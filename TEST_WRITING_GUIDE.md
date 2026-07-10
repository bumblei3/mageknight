# Test Writing Guide

## Overview

This project uses **[Vitest](https://vitest.dev/)** with a **jsdom** environment
for unit and integration tests. The old custom test runner (`tests/testRunner.js`)
has been **removed** — do not import it. Use the standard Vitest globals
(`describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach`) directly.

Two helper modules complement Vitest and **are still in use** — import from them
when you need prebuilt mocks/builders:

- `tests/test-mocks.js` — `setupGlobalMocks()`, `resetMocks()`, `createSpy()`,
  `createMockUI()`, `createMockElement()`, `createMockContext()`,
  `createMockCanvas()`, `createMockLocalStorage()`, `createMockDocument()`,
  `MockHTMLElement`, `restoreRandom()`, `setupStandardGameDOM()` …
- `tests/test-helpers.js` — `HeroBuilder`, `createMockEnemy()`, `createMockHexGrid()`,
  `assertHeroState()`, `createTestGame()` …

## Scripts

```bash
npm test                       # run all unit/integration tests
npm run test:watch             # watch mode
npx vitest run <file>          # run a single test file
npm run test:coverage          # run with coverage (v8 provider)
npx vitest run --coverage <file>   # coverage for one file only
npm run test:e2e               # Playwright end-to-end tests (separate, see tests/e2e)
```

## Configuration

Defined in `vitest.config.js`:

- **environment**: `jsdom` (browser-like DOM)
- **globals**: `true` (no need to import `describe`/`it`/`expect`)
- **setupFiles**: `./tests/setup.js` — global mocks for the browser APIs jsdom lacks
- **include**: `tests/**/*.{test,spec}.{js,ts}` (E2E + a11y/visual files excluded)
- **coverage provider**: `v8`, threshold **80%** lines/functions/branches/statements
  on included `js/**` modules (see `coverage.exclude` for the UI/3D/worker files that
  are intentionally skipped)

## What `tests/setup.js` provides (for free)

You do **not** need to mock these yourself — they are set up globally before every
test file:

- `window.AudioContext` / `webkitAudioContext` (no-op mock)
- `HTMLCanvasElement.prototype.getContext('2d')` (returns a stub 2D context)
- `ResizeObserver`, `matchMedia`, `getComputedStyle`
- `requestAnimationFrame` / `cancelAnimationFrame` (driven by `setTimeout`)
- `localStorage` (in-memory)
- `window.Worker` (no-op worker)
- `Element.prototype.scrollIntoView`, `getBoundingClientRect`

For anything not covered above, mock it locally in your test with `vi.fn()` /
`vi.spyOn(...)` (see examples below).

## Anatomy of a test file

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../js/eventBus.js';

describe('EventBus', () => {
    let bus;

    beforeEach(() => {
        bus = new EventBus();
    });

    it('delivers emitted data to subscribers', () => {
        const cb = vi.fn();
        bus.on('test', cb);
        bus.emit('test', { value: 42 });
        expect(cb).toHaveBeenCalledWith({ value: 42 });
    });
});
```

You can also omit the `vitest` import (globals are enabled), but importing it is
fine and makes the file self-contained.

## Available assertions

Vitest uses the **Jest-compatible** expectation API. Common ones:

```javascript
expect(value).toBe(expected);            // strict ===
expect(value).toEqual(expected);         // deep equality
expect(value).toBeTruthy();              // /toBeFalsy() /toBeDefined() /toBeUndefined() /toBeNull()
expect(value).toBeGreaterThan(5);        // /toBeGreaterThanOrEqual /toBeLessThan /toBeLessThanOrEqual
expect(string).toContain('sub');         // /toMatch(/regex/)
expect(array).toContain(item);           // /toHaveLength(3)
expect(obj).toHaveProperty('key');       // /toHaveProperty('key', 'value')
expect(fn).toThrow();                    // /toThrow('message')
expect(fn).not.toThrow();
expect(spy).toHaveBeenCalled();          // /toHaveBeenCalledWith(arg)
expect(spy).toHaveBeenCalledTimes(2);
```

## Mocking

### Spy on methods

```javascript
const spy = vi.spyOn(hero, 'gainFame');
// ...exercise code...
expect(spy).toHaveBeenCalledWith(10);
spy.mockRestore(); // or use afterEach(() => vi.restoreAllMocks())
```

### Replace Math.random (deterministic RNG branches)

Many game modules branch on `Math.random()`. Spy on it to force a branch:

```javascript
const spy = vi.spyOn(Math, 'random');

it('picks the deep guard when random > 0.6', () => {
    spy.mockReturnValue(0.9);
    handler.attackMine();
    expect(game.combatOrchestrator.initiateCombat.mock.calls[0][0].name)
        .toBe('Minen-Aufseher');
});

it('picks the shallow guard otherwise', () => {
    spy.mockReturnValue(0.1);
    handler.attackMine();
    expect(game.combatOrchestrator.initiateCombat.mock.calls[0][0].name)
        .toBe('Kristall-Wächter');
});

afterEach(() => spy.mockRestore());
```

### Plain-object mock game (preferred for handlers)

Site/UI handlers only touch `this.game` hooks, so a plain object with `vi.fn()`
mocks is sufficient and reliable (prefer this over instantiating the full
`MageKnightGame`, which pulls in heavy DOM/canvas/worker wiring):

```javascript
function makeMockGame() {
    const hero = {
        movementPoints: 5,
        influencePoints: 20,
        crystals: { RED: 0, BLUE: 0, GREEN: 0, WHITE: 0 },
        gainCrystal: vi.fn(),
        gainFame: vi.fn(),
        units: [],
        wounds: [],
        discard: [],
        addUnit: vi.fn().mockReturnValue(true),
        healWound: vi.fn().mockReturnValue(true),
        getManaInventory: vi.fn().mockReturnValue(['red', 'blue', 'green', 'white']),
        removeMana: vi.fn(),
    };
    return {
        hero,
        addLog: vi.fn(),
        updateStats: vi.fn(),
        showNotification: vi.fn(),
        combatOrchestrator: { initiateCombat: vi.fn() },
        hexGrid: { axialToPixel: vi.fn().mockReturnValue({ x: 10, y: 20 }) },
        particleSystem: { buffEffect: vi.fn() },
    };
}
```

When a module calls into a real singleton (e.g. `SiteRewardManager.getInstance()`),
make sure your mock hero has the methods that singleton expects
(`crystals`, `gainFame`, `healWound`, `units`, `discard`).

## Best Practices

1. **One concept per test** — keep assertions focused.
2. **Descriptive names** — `should reduce enemy armor when attacked`.
3. **Use `beforeEach` for setup**, `afterEach` to restore mocks.
4. **Test edge cases** — zero / negative / missing / unknown inputs.
5. **Mock external dependencies** (DOM, timers, singletons) — don't rely on
   real browser behavior.
6. **Deterministic over flaky** — never assert on random output directly. Force
   RNG with `vi.spyOn(Math, 'random')`, or roll many times and assert a property
   holds (e.g. "all rolled names are non-empty").
7. **Keep tests isolated** — no test should depend on another.
8. **Treat test code like production code** — readable, maintained, no dead mocks.

## Async code

```javascript
it('should resolve a promise', async () => {
    const result = await game.asyncOperation();
    expect(result).toBe(true);
});

it('should call callback', () => {
    return game.asyncOperation().then((r) => expect(r).toBe(true));
});
```

## Coverage guidelines

- **Target**: 80%+ statements / branches / functions / lines (enforced by the
  Vitest `coverage.check` gate — a run fails if a covered module drops below it).
- **Always test**: core game logic, edge cases, error handling.
- **Skip**: third-party internals, trivial getters, pure UI animation.
- To check a single module's coverage: `npx vitest run tests/foo.test.js --coverage --coverage.include='js/foo.ts'`

## Running tests

```bash
npm test                       # all unit/integration tests
npx vitest run tests/eventBus.test.js --reporter=verbose   # one file, verbose
npm run test:coverage          # full coverage report (text + html in ./coverage)
```

## Examples in the repo

- `tests/eventBus.test.js` — small class, full behavior + error isolation
- `tests/manaSource.test.js` — RNG branches forced via `Math.random` spy + plain mock
- `tests/siteRewards.test.js` — data tables + many switch-branches
- `tests/sites/siteHandlers.test.js`, `tests/sites/siteHandlers2.test.js` — site
  handlers with plain-object mock games and sub-item action coverage

## Getting help

- `vitest.config.js` — runner / coverage config
- `tests/setup.js` — global browser-API mocks
- Existing tests under `tests/` are the best reference for patterns
