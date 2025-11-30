
export class TestRunner {
    constructor() {
        this.tests = [];
        this.currentSuite = 'Global';
    }

    describe(name, callback) {
        this.currentSuite = name;
        callback();
    }

    it(name, callback) {
        this.tests.push({
            suite: this.currentSuite,
            name: name,
            callback: callback
        });
    }

    expect(actual) {
        return {
            toBe: (expected) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${expected} but got ${actual}`);
                }
            },
            toEqual: (expected) => {
                const actualStr = JSON.stringify(actual);
                const expectedStr = JSON.stringify(expected);
                if (actualStr !== expectedStr) {
                    throw new Error(`Expected ${expectedStr} but got ${actualStr}`);
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
            }
        };
    }

    async run() {
        const isBrowser = typeof document !== 'undefined';
        let resultsContainer;

        if (isBrowser) {
            resultsContainer = document.getElementById('test-results');
            resultsContainer.innerHTML = '';
        } else {
            console.log('🧪 Running Tests...');
        }

        let passed = 0;
        let failed = 0;

        for (const test of this.tests) {
            try {
                await test.callback();
                passed++;
                if (isBrowser) {
                    const el = document.createElement('div');
                    el.className = 'test-result pass';
                    el.innerHTML = `✅ <strong>${test.suite}</strong>: ${test.name}`;
                    resultsContainer.appendChild(el);
                } else {
                    // console.log(`✅ ${test.suite}: ${test.name}`);
                }
            } catch (e) {
                failed++;
                if (isBrowser) {
                    const el = document.createElement('div');
                    el.className = 'test-result fail';
                    el.innerHTML = `❌ <strong>${test.suite}</strong>: ${test.name}<br><span class="error">${e.message}</span>`;
                    resultsContainer.appendChild(el);
                    console.error(e);
                } else {
                    console.error(`❌ ${test.suite}: ${test.name}`);
                    console.error(`   ${e.message}`);
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
            if (failed > 0) process.exit(1);
        }
    }
}

export const runner = new TestRunner();
export const describe = runner.describe.bind(runner);
export const it = runner.it.bind(runner);
export const expect = runner.expect.bind(runner);
