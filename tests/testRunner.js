
export class TestRunner {
    constructor() {
        this.tests = [];
        this.suiteStack = ['Global'];
        this.beforeEachCallbacks = [];
        this.afterEachCallbacks = [];
    }

    describe(name, callback) {
        this.suiteStack.push(name);
        callback();
        this.suiteStack.pop();
    }

    get currentSuitePath() {
        return [...this.suiteStack];
    }

    beforeEach(callback) {
        this.beforeEachCallbacks.push({
            suitePath: this.currentSuitePath,
            callback: callback
        });
    }

    afterEach(callback) {
        this.afterEachCallbacks.push({
            suitePath: this.currentSuitePath,
            callback: callback
        });
    }

    it(name, callback, options = {}) {
        this.tests.push({
            suitePath: this.currentSuitePath,
            name: name,
            callback: callback,
            timeout: options.timeout || 5000 // Default 5s timeout
        });
    }

    expect(actual) {
        const matchers = {
            toBe: (expected) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
                }
            },
            toEqual: (expected) => {
                const actualStr = JSON.stringify(actual);
                const expectedStr = JSON.stringify(expected);
                if (actualStr !== expectedStr) {
                    throw new Error(`Expected ${actualStr} to equal ${expectedStr}`);
                }
            },
            toBeTruthy: () => {
                if (!actual) {
                    throw new Error(`Expected ${actual} to be truthy`);
                }
            },
            toBeFalsy: () => {
                if (actual) {
                    throw new Error(`Expected ${actual} to be falsy`);
                }
            },
            toBeGreaterThan: (expected) => {
                if (!(actual > expected)) {
                    throw new Error(`Expected ${actual} to be greater than ${expected}`);
                }
            },
            toBeLessThan: (expected) => {
                if (!(actual < expected)) {
                    throw new Error(`Expected ${actual} to be less than ${expected}`);
                }
            },
            toBeGreaterThanOrEqual: (expected) => {
                if (!(actual >= expected)) {
                    throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
                }
            },
            toBeLessThanOrEqual: (expected) => {
                if (!(actual <= expected)) {
                    throw new Error(`Expected ${actual} to be less than or equal to ${expected}`);
                }
            },
            toBeDefined: () => {
                if (actual === undefined || actual === null) {
                    throw new Error(`Expected ${actual} to be defined`);
                }
            },
            toBeNull: () => {
                if (actual !== null) {
                    throw new Error(`Expected ${actual} to be null`);
                }
            },
            toBeUndefined: () => {
                if (actual !== undefined) {
                    throw new Error(`Expected ${actual} to be undefined`);
                }
            },
            toContain: (expected) => {
                const contains = Array.isArray(actual)
                    ? actual.includes(expected)
                    : typeof actual === 'string' && actual.includes(expected);
                if (!contains) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to contain ${expected}`);
                }
            },
            toMatch: (regex) => {
                const re = new RegExp(regex);
                if (!re.test(actual)) {
                    throw new Error(`Expected ${actual} to match ${regex}`);
                }
            },
            toHaveLength: (expected) => {
                if (actual.length !== expected) {
                    throw new Error(`Expected length ${expected} but got ${actual.length}`);
                }
            },
            toThrow: (errorMessageOrType) => {
                if (typeof actual !== 'function') {
                    throw new Error('toThrow expects a function');
                }
                let thrown = false;
                let error;
                try {
                    actual();
                } catch (e) {
                    thrown = true;
                    error = e;
                }
                if (!thrown) {
                    throw new Error('Expected function to throw but it did not');
                }
                if (errorMessageOrType) {
                    if (typeof errorMessageOrType === 'string') {
                        if (!error.message.includes(errorMessageOrType)) {
                            throw new Error(`Expected error message to include "${errorMessageOrType}" but got "${error.message}"`);
                        }
                    }
                }
            },
            toBeCloseTo: (expected, precision = 2) => {
                const diff = Math.abs(actual - expected);
                const threshold = Math.pow(10, -precision) / 2;
                if (diff >= threshold) {
                    throw new Error(`Expected ${actual} to be close to ${expected} (precision: ${precision}), difference was ${diff}`);
                }
            },
            toHaveProperty: (path, value) => {
                const keys = path.split('.');
                let current = actual;
                for (const key of keys) {
                    if (current == null || !Object.prototype.hasOwnProperty.call(current, key)) {
                        throw new Error(`Expected object to have property "${path}"`);
                    }
                    current = current[key];
                }
                if (value !== undefined && current !== value) {
                    throw new Error(`Expected property "${path}" to be ${value} but got ${current}`);
                }
            },
            toMatchObject: (expected) => {
                const matches = (obj, pattern) => {
                    for (const key in pattern) {
                        if (!Object.prototype.hasOwnProperty.call(obj, key)) {
                            return false;
                        }
                        const objVal = obj[key];
                        const patternVal = pattern[key];
                        if (typeof patternVal === 'object' && patternVal !== null && !Array.isArray(patternVal)) {
                            if (typeof objVal !== 'object' || objVal === null || !matches(objVal, patternVal)) {
                                return false;
                            }
                        } else if (objVal !== patternVal) {
                            return false;
                        }
                    }
                    return true;
                };
                if (!matches(actual, expected)) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to match object ${JSON.stringify(expected)}`);
                }
            },
            toBeInstanceOf: (constructor) => {
                if (!(actual instanceof constructor)) {
                    throw new Error(`Expected ${actual} to be instance of ${constructor.name}`);
                }
            },
            toBeNaN: () => {
                if (!Number.isNaN(actual)) {
                    throw new Error(`Expected ${actual} to be NaN`);
                }
            }
        };

        // Add .not modifier
        matchers.not = {
            toBe: (expected) => {
                if (actual === expected) {
                    throw new Error(`Expected ${actual} not to be ${expected}`);
                }
            },
            toBeNull: () => {
                if (actual === null) {
                    throw new Error(`Expected ${actual} not to be null`);
                }
            },
            toEqual: (expected) => {
                const actualStr = JSON.stringify(actual);
                const expectedStr = JSON.stringify(expected);
                if (actualStr === expectedStr) {
                    throw new Error(`Expected ${actualStr} not to equal ${expectedStr}`);
                }
            },
            toContain: (expected) => {
                const contains = Array.isArray(actual)
                    ? actual.includes(expected)
                    : typeof actual === 'string' && actual.includes(expected);
                if (contains) {
                    throw new Error(`Expected ${JSON.stringify(actual)} not to contain ${expected}`);
                }
            },
            toBeTruthy: () => {
                if (actual) {
                    throw new Error(`Expected ${actual} not to be truthy`);
                }
            },
            toBeFalsy: () => {
                if (!actual) {
                    throw new Error(`Expected ${actual} not to be falsy`);
                }
            },
            toThrow: (errorMessageOrType) => {
                if (typeof actual !== 'function') {
                    throw new Error('toThrow expects a function');
                }
                let thrown = false;
                let error;
                try {
                    actual();
                } catch (e) {
                    thrown = true;
                    error = e;
                }
                if (thrown) {
                    throw new Error(`Expected function NOT to throw, but it threw: ${error.message}`);
                }
            },
            // Custom Matchers
            toBeValidHero: () => {
                const isValid = actual &&
                    typeof actual.name === 'string' &&
                    typeof actual.level === 'number' &&
                    actual.level >= 1;
                if (!isValid) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to be a valid hero`);
                }
            },
            toHaveDefeatedEnemy: (enemy) => {
                // Assuming combat object or similar
                const hasDefeated = actual.defeatedEnemies && actual.defeatedEnemies.includes(enemy);
                if (!hasDefeated) {
                    throw new Error(`Expected to have defeated enemy ${enemy.name || enemy}`);
                }
            },
            toMatchHTML: (expectedHTML) => {
                // Normalize whitespace: remove newlines and extra spaces
                const normalize = (html) => html.replace(/\s+/g, ' ').trim();
                const actualNorm = normalize(actual);
                const expectedNorm = normalize(expectedHTML);

                if (actualNorm !== expectedNorm) {
                    // For debugging, don't show full diff if too huge, but here it's fine
                    throw new Error(`Expected HTML not matched.\nActual: ${actualNorm}\nExpected: ${expectedNorm}`);
                }
            }
        };

        return matchers;
    }

    async run(options = {}) {
        const { grep } = options;
        const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
        const isBrowser = !isNode && typeof document !== 'undefined';

        let resultsContainer;
        if (isBrowser) {
            resultsContainer = document.getElementById('test-results');
            if (resultsContainer) resultsContainer.innerHTML = '';
        } else {
            console.log('🧪 Running Tests...');
        }

        let passed = 0;
        let failed = 0;

        for (const test of this.tests) {
            const suiteName = test.suitePath.join(' ➔ ');
            const fullTestName = `${suiteName}: ${test.name}`;

            // Filter tests if grep option is provided
            if (grep && !fullTestName.includes(grep)) {
                continue;
            }

            try {
                // Run all matching beforeEach hooks (hierarchy: global -> parent -> child)
                const matchingBefore = this.beforeEachCallbacks.filter(b =>
                    b.suitePath.every((name, i) => test.suitePath[i] === name)
                );
                for (const before of matchingBefore) {
                    await before.callback();
                }

                // Execute test with timeout
                await Promise.race([
                    new Promise(async (resolve, reject) => {
                        try {
                            if (test.callback.length > 0) {
                                await new Promise((doneResolve, doneReject) => {
                                    test.callback((err) => {
                                        if (err) doneReject(err);
                                        else doneResolve();
                                    });
                                });
                            } else {
                                await test.callback();
                            }
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error(`Test timed out after ${test.timeout}ms`)), test.timeout)
                    )
                ]);

                passed++;
                if (isBrowser) {
                    const el = document.createElement('div');
                    el.className = 'test-result pass';
                    el.innerHTML = `✅ <strong>${suiteName}</strong>: ${test.name}`;
                    resultsContainer.appendChild(el);
                } else {
                    // console.log(`✅ ${suiteName}: ${test.name}`);
                }
            } catch (e) {
                failed++;
                if (isBrowser) {
                    const el = document.createElement('div');
                    el.className = 'test-result fail';
                    el.innerHTML = `❌ <strong>${suiteName}</strong>: ${test.name}<br><span class="error">${e.message}</span>`;
                    resultsContainer.appendChild(el);
                    console.error(e);
                } else {
                    console.error(`❌ ${suiteName}: ${test.name}`);
                    console.error(`   ${e.message}`);
                    console.error(e.stack); // Added stack trace
                }
            } finally {
                // Release callback reference to allow GC of closures
                test.callback = null;

                // Run all matching afterEach hooks (hierarchy: child -> parent -> global)
                const matchingAfter = this.afterEachCallbacks.filter(b =>
                    b.suitePath.every((name, i) => test.suitePath[i] === name)
                ).reverse();
                for (const after of matchingAfter) {
                    try {
                        await after.callback();
                    } catch (e) {
                        console.error(`Error in afterEach for ${suiteName}: ${e.message}`);
                    }
                }
            }
        }

        const summaryText = `Total: ${this.tests.length} | Passed: ${passed} | Failed: ${failed}`;

        if (isBrowser) {
            const summary = document.createElement('div');
            summary.className = 'test-summary';
            summary.innerHTML = summaryText;
            resultsContainer.prepend(summary);
        } else {
            console.log('\n' + summaryText);
            if (!options.noExit && failed > 0) process.exit(1);
        }

        return { passed, failed, total: this.tests.length };
    }
    reset() {
        this.tests = [];
        this.suiteStack = ['Global'];
        this.beforeEachCallbacks = [];
        this.afterEachCallbacks = [];
    }
}

export const runner = new TestRunner();
export const describe = runner.describe.bind(runner);
export const it = runner.it.bind(runner);
export const beforeEach = runner.beforeEach.bind(runner);
export const afterEach = runner.afterEach.bind(runner);
export const expect = runner.expect.bind(runner);
export const reset = runner.reset.bind(runner);
