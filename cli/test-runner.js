// test-runner.js - Test Execution Engine
// Runs all test cases and collects results

import { resetMocks, storageData } from './browser-mock.js';

// Test result status
export const TestStatus = {
    PENDING: '[ ]',
    PASSED: '[x]',
    FAILED: '[!]',
    SKIPPED: '[-]'
};

// Test result class
export class TestResult {
    constructor(id, description) {
        this.id = id;
        this.description = description;
        this.status = TestStatus.PENDING;
        this.error = null;
        this.expected = null;
        this.actual = null;
        this.duration = 0;
        this.timestamp = null;
    }

    pass() {
        this.status = TestStatus.PASSED;
        this.timestamp = new Date().toISOString();
    }

    fail(error, expected = null, actual = null) {
        this.status = TestStatus.FAILED;
        this.error = error;
        this.expected = expected;
        this.actual = actual;
        this.timestamp = new Date().toISOString();
    }

    skip(reason = 'Skipped') {
        this.status = TestStatus.SKIPPED;
        this.error = reason;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            description: this.description,
            status: this.status,
            error: this.error,
            expected: this.expected,
            actual: this.actual,
            duration: this.duration,
            timestamp: this.timestamp
        };
    }
}

// Test suite class
export class TestSuite {
    constructor(name, category) {
        this.name = name;
        this.category = category;
        this.tests = [];
        this.beforeEach = null;
        this.afterEach = null;
        this.beforeAll = null;
        this.afterAll = null;
    }

    addTest(id, description, testFn) {
        this.tests.push({
            id,
            description,
            fn: testFn,
            result: new TestResult(id, description)
        });
    }

    setBeforeEach(fn) {
        this.beforeEach = fn;
    }

    setAfterEach(fn) {
        this.afterEach = fn;
    }

    setBeforeAll(fn) {
        this.beforeAll = fn;
    }

    setAfterAll(fn) {
        this.afterAll = fn;
    }

    async run(options = {}) {
        const { verbose = false, filter = null } = options;

        if (this.beforeAll) {
            await this.beforeAll();
        }

        for (const test of this.tests) {
            // Apply filter if provided
            if (filter && !test.id.includes(filter) && !test.description.includes(filter)) {
                test.result.skip('Filtered out');
                continue;
            }

            // Reset mocks before each test
            resetMocks();

            if (this.beforeEach) {
                await this.beforeEach();
            }

            const startTime = performance.now();

            try {
                await test.fn(test.result);

                // If test didn't explicitly pass/fail, mark as passed
                if (test.result.status === TestStatus.PENDING) {
                    test.result.pass();
                }
            } catch (error) {
                test.result.fail(error.message || String(error));
                if (verbose) {
                    console.error(`  Error in ${test.id}:`, error);
                }
            }

            test.result.duration = performance.now() - startTime;

            if (this.afterEach) {
                await this.afterEach();
            }

            if (verbose) {
                const statusSymbol = test.result.status === TestStatus.PASSED ? '\u2713' :
                                     test.result.status === TestStatus.FAILED ? '\u2717' : '-';
                console.log(`  ${statusSymbol} ${test.id}: ${test.description}`);
                if (test.result.error) {
                    console.log(`    Error: ${test.result.error}`);
                }
            }
        }

        if (this.afterAll) {
            await this.afterAll();
        }

        return this.getResults();
    }

    getResults() {
        return this.tests.map(t => t.result);
    }

    getStats() {
        const results = this.getResults();
        return {
            total: results.length,
            passed: results.filter(r => r.status === TestStatus.PASSED).length,
            failed: results.filter(r => r.status === TestStatus.FAILED).length,
            skipped: results.filter(r => r.status === TestStatus.SKIPPED).length,
            pending: results.filter(r => r.status === TestStatus.PENDING).length
        };
    }
}

// Test runner class
export class TestRunner {
    constructor() {
        this.suites = [];
        this.results = [];
        this.startTime = null;
        this.endTime = null;
    }

    addSuite(suite) {
        this.suites.push(suite);
    }

    async runAll(options = {}) {
        const { verbose = false, filter = null, stopOnFail = false } = options;

        this.startTime = new Date();
        this.results = [];

        console.log('\n========================================');
        console.log('  Test Execution Started');
        console.log(`  ${this.startTime.toISOString()}`);
        console.log('========================================\n');

        for (const suite of this.suites) {
            console.log(`\n[${suite.category}] ${suite.name}`);
            console.log('-'.repeat(40));

            const suiteResults = await suite.run({ verbose, filter });
            this.results.push({
                suite: suite.name,
                category: suite.category,
                results: suiteResults,
                stats: suite.getStats()
            });

            const stats = suite.getStats();
            console.log(`  Total: ${stats.total}, Passed: ${stats.passed}, Failed: ${stats.failed}, Skipped: ${stats.skipped}`);

            if (stopOnFail && stats.failed > 0) {
                console.log('\n[STOPPED] Test execution stopped due to failure.');
                break;
            }
        }

        this.endTime = new Date();

        this.printSummary();

        return this.results;
    }

    printSummary() {
        const duration = (this.endTime - this.startTime) / 1000;

        let totalTests = 0;
        let totalPassed = 0;
        let totalFailed = 0;
        let totalSkipped = 0;

        this.results.forEach(r => {
            totalTests += r.stats.total;
            totalPassed += r.stats.passed;
            totalFailed += r.stats.failed;
            totalSkipped += r.stats.skipped;
        });

        console.log('\n========================================');
        console.log('  Test Summary');
        console.log('========================================');
        console.log(`  Total Tests:  ${totalTests}`);
        console.log(`  Passed:       ${totalPassed} (${(totalPassed/totalTests*100).toFixed(1)}%)`);
        console.log(`  Failed:       ${totalFailed} (${(totalFailed/totalTests*100).toFixed(1)}%)`);
        console.log(`  Skipped:      ${totalSkipped}`);
        console.log(`  Duration:     ${duration.toFixed(2)}s`);
        console.log('========================================\n');

        if (totalFailed > 0) {
            console.log('\nFailed Tests:');
            console.log('-'.repeat(40));
            this.results.forEach(r => {
                r.results.filter(t => t.status === TestStatus.FAILED).forEach(t => {
                    console.log(`  ${t.id}: ${t.description}`);
                    console.log(`    Error: ${t.error}`);
                    if (t.expected !== null) {
                        console.log(`    Expected: ${JSON.stringify(t.expected)}`);
                        console.log(`    Actual:   ${JSON.stringify(t.actual)}`);
                    }
                });
            });
        }
    }

    getOverallStats() {
        let totalTests = 0;
        let totalPassed = 0;
        let totalFailed = 0;
        let totalSkipped = 0;

        this.results.forEach(r => {
            totalTests += r.stats.total;
            totalPassed += r.stats.passed;
            totalFailed += r.stats.failed;
            totalSkipped += r.stats.skipped;
        });

        return {
            total: totalTests,
            passed: totalPassed,
            failed: totalFailed,
            skipped: totalSkipped,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.endTime ? (this.endTime - this.startTime) / 1000 : 0
        };
    }

    getFailedTests() {
        const failed = [];
        this.results.forEach(r => {
            r.results.filter(t => t.status === TestStatus.FAILED).forEach(t => {
                failed.push({
                    suite: r.suite,
                    category: r.category,
                    ...t.toJSON()
                });
            });
        });
        return failed;
    }

    toJSON() {
        return {
            startTime: this.startTime?.toISOString(),
            endTime: this.endTime?.toISOString(),
            stats: this.getOverallStats(),
            suites: this.results.map(r => ({
                name: r.suite,
                category: r.category,
                stats: r.stats,
                tests: r.results.map(t => t.toJSON())
            }))
        };
    }
}

// Assertion helpers
export const assert = {
    equal(actual, expected, message = '') {
        if (actual !== expected) {
            const error = new Error(message || `Expected ${expected}, got ${actual}`);
            error.expected = expected;
            error.actual = actual;
            throw error;
        }
    },

    deepEqual(actual, expected, message = '') {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        if (actualStr !== expectedStr) {
            const error = new Error(message || `Deep equality failed`);
            error.expected = expected;
            error.actual = actual;
            throw error;
        }
    },

    notEqual(actual, expected, message = '') {
        if (actual === expected) {
            const error = new Error(message || `Expected value to be different from ${expected}`);
            error.expected = `not ${expected}`;
            error.actual = actual;
            throw error;
        }
    },

    isTrue(value, message = '') {
        if (value !== true) {
            const error = new Error(message || `Expected true, got ${value}`);
            error.expected = true;
            error.actual = value;
            throw error;
        }
    },

    isFalse(value, message = '') {
        if (value !== false) {
            const error = new Error(message || `Expected false, got ${value}`);
            error.expected = false;
            error.actual = value;
            throw error;
        }
    },

    isNull(value, message = '') {
        if (value !== null) {
            const error = new Error(message || `Expected null, got ${value}`);
            error.expected = null;
            error.actual = value;
            throw error;
        }
    },

    isNotNull(value, message = '') {
        if (value === null) {
            const error = new Error(message || 'Expected non-null value');
            error.expected = 'not null';
            error.actual = null;
            throw error;
        }
    },

    isDefined(value, message = '') {
        if (value === undefined) {
            const error = new Error(message || 'Expected value to be defined');
            error.expected = 'defined';
            error.actual = 'undefined';
            throw error;
        }
    },

    isUndefined(value, message = '') {
        if (value !== undefined) {
            const error = new Error(message || `Expected undefined, got ${value}`);
            error.expected = 'undefined';
            error.actual = value;
            throw error;
        }
    },

    isArray(value, message = '') {
        if (!Array.isArray(value)) {
            const error = new Error(message || `Expected array, got ${typeof value}`);
            error.expected = 'array';
            error.actual = typeof value;
            throw error;
        }
    },

    isObject(value, message = '') {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            const error = new Error(message || `Expected object, got ${typeof value}`);
            error.expected = 'object';
            error.actual = typeof value;
            throw error;
        }
    },

    isFunction(value, message = '') {
        if (typeof value !== 'function') {
            const error = new Error(message || `Expected function, got ${typeof value}`);
            error.expected = 'function';
            error.actual = typeof value;
            throw error;
        }
    },

    isNumber(value, message = '') {
        if (typeof value !== 'number' || isNaN(value)) {
            const error = new Error(message || `Expected number, got ${typeof value}`);
            error.expected = 'number';
            error.actual = typeof value;
            throw error;
        }
    },

    isString(value, message = '') {
        if (typeof value !== 'string') {
            const error = new Error(message || `Expected string, got ${typeof value}`);
            error.expected = 'string';
            error.actual = typeof value;
            throw error;
        }
    },

    greaterThan(actual, expected, message = '') {
        if (!(actual > expected)) {
            const error = new Error(message || `Expected ${actual} to be greater than ${expected}`);
            error.expected = `> ${expected}`;
            error.actual = actual;
            throw error;
        }
    },

    greaterThanOrEqual(actual, expected, message = '') {
        if (!(actual >= expected)) {
            const error = new Error(message || `Expected ${actual} to be >= ${expected}`);
            error.expected = `>= ${expected}`;
            error.actual = actual;
            throw error;
        }
    },

    lessThan(actual, expected, message = '') {
        if (!(actual < expected)) {
            const error = new Error(message || `Expected ${actual} to be less than ${expected}`);
            error.expected = `< ${expected}`;
            error.actual = actual;
            throw error;
        }
    },

    lessThanOrEqual(actual, expected, message = '') {
        if (!(actual <= expected)) {
            const error = new Error(message || `Expected ${actual} to be <= ${expected}`);
            error.expected = `<= ${expected}`;
            error.actual = actual;
            throw error;
        }
    },

    inRange(actual, min, max, message = '') {
        if (actual < min || actual > max) {
            const error = new Error(message || `Expected ${actual} to be in range [${min}, ${max}]`);
            error.expected = `[${min}, ${max}]`;
            error.actual = actual;
            throw error;
        }
    },

    includes(array, value, message = '') {
        if (!array.includes(value)) {
            const error = new Error(message || `Expected array to include ${value}`);
            error.expected = value;
            error.actual = array;
            throw error;
        }
    },

    notIncludes(array, value, message = '') {
        if (array.includes(value)) {
            const error = new Error(message || `Expected array not to include ${value}`);
            error.expected = `not ${value}`;
            error.actual = array;
            throw error;
        }
    },

    hasProperty(obj, prop, message = '') {
        if (!(prop in obj)) {
            const error = new Error(message || `Expected object to have property ${prop}`);
            error.expected = prop;
            error.actual = Object.keys(obj);
            throw error;
        }
    },

    throws(fn, message = '') {
        let threw = false;
        try {
            fn();
        } catch (e) {
            threw = true;
        }
        if (!threw) {
            throw new Error(message || 'Expected function to throw');
        }
    },

    async asyncThrows(fn, message = '') {
        let threw = false;
        try {
            await fn();
        } catch (e) {
            threw = true;
        }
        if (!threw) {
            throw new Error(message || 'Expected async function to throw');
        }
    },

    closeTo(actual, expected, delta, message = '') {
        if (Math.abs(actual - expected) > delta) {
            const error = new Error(message || `Expected ${actual} to be within ${delta} of ${expected}`);
            error.expected = `${expected} ± ${delta}`;
            error.actual = actual;
            throw error;
        }
    }
};

// Utility to create test ID
export function createTestId(category, number) {
    return `${category}-${String(number).padStart(4, '0')}`;
}

export default TestRunner;
