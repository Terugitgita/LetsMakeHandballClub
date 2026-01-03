#!/usr/bin/env node
// run-tests.js - Main Test Entry Point
// Usage: node cli/run-tests.js [options]
//   --verbose       Show detailed output
//   --filter=XX     Run only tests matching XX
//   --category=X    Run only tests in category X (TR, MT, TN, AC, SR, SL, BUG)
//   --stopOnFail    Stop on first failure
//   --basic         Run basic test suite (~228 tests)
//   --full          Run full test suite (~2000 tests) [default]
//   --version=XX    Set output file version (e.g., --version=01)

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

// Import browser mocks FIRST (this sets up global environment)
import './browser-mock.js';

// Import test runner
import { TestRunner } from './test-runner.js';

// Import report generator
import { generateMarkdownReport, generateJsonReport } from './report-generator.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const docsDir = join(__dirname, '..', 'docs');

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        verbose: false,
        filter: null,
        category: null,
        stopOnFail: false,
        basic: false,
        full: true,
        version: null  // Output file version suffix (e.g., "01", "02")
    };

    args.forEach(arg => {
        if (arg === '--verbose' || arg === '-v') {
            options.verbose = true;
        } else if (arg.startsWith('--filter=')) {
            options.filter = arg.split('=')[1];
        } else if (arg.startsWith('--category=')) {
            options.category = arg.split('=')[1].toUpperCase();
        } else if (arg === '--stopOnFail') {
            options.stopOnFail = true;
        } else if (arg === '--basic') {
            options.basic = true;
            options.full = false;
        } else if (arg === '--full') {
            options.full = true;
            options.basic = false;
        } else if (arg.startsWith('--version=')) {
            options.version = arg.split('=')[1].padStart(2, '0');
        }
    });

    return options;
}

// Main execution
async function main() {
    const options = parseArgs();

    // Dynamically import the appropriate test generator
    let generateAllTestSuites, countAllTests;

    if (options.basic) {
        const basicGen = await import('./basic-test-generator.js');
        generateAllTestSuites = basicGen.generateAllTestSuites;
        countAllTests = basicGen.countAllTests;
    } else {
        const fullGen = await import('./full-test-generator.js');
        generateAllTestSuites = fullGen.generateAllTestSuites;
        countAllTests = fullGen.countAllTests;
    }

    const testMode = options.basic ? 'Basic' : 'Full';
    const version = options.version || (options.basic ? '01' : '02');

    console.log('\n===========================================');
    console.log('  ズッキュン中学物語 - CLI Test Suite');
    console.log(`  Mode: ${testMode} | Version: ${version}`);
    console.log('===========================================\n');

    // Count tests
    const testCounts = countAllTests();
    console.log(`Total test patterns: ${testCounts.total}`);
    console.log('Test counts by category:');
    Object.entries(testCounts.counts).forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count}`);
    });
    console.log('');

    const runner = new TestRunner();

    // Generate all test suites
    console.log('Generating test suites...');
    const suites = generateAllTestSuites();

    // Filter by category if specified
    suites.forEach(suite => {
        if (!options.category || suite.category === options.category) {
            runner.addSuite(suite);
        }
    });

    // Count filtered tests
    let filteredCount = 0;
    runner.suites.forEach(s => filteredCount += s.tests.length);
    console.log(`Running ${filteredCount} tests...\n`);

    // Run all tests
    const startTime = Date.now();
    const results = await runner.runAll(options);
    const duration = (Date.now() - startTime) / 1000;

    console.log(`\nTotal execution time: ${duration.toFixed(2)}s`);

    // Generate reports
    console.log('\nGenerating reports...');

    try {
        // Ensure docs directory exists
        if (!existsSync(docsDir)) {
            mkdirSync(docsDir, { recursive: true });
        }

        // Generate and save JSON report with version suffix
        const jsonReport = generateJsonReport(runner);
        jsonReport.metadata.testMode = testMode;
        jsonReport.metadata.version = version;

        const jsonPath = join(docsDir, `test-results-${version}.json`);
        writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf8');
        console.log(`  JSON report: ${jsonPath}`);

        // Generate and save Markdown report with version suffix
        const mdReport = generateMarkdownReport(runner, version);
        const mdPath = join(docsDir, `All_Pattern_Test_${version}.md`);
        writeFileSync(mdPath, mdReport, 'utf8');
        console.log(`  Markdown report: ${mdPath}`);

    } catch (error) {
        console.error('Failed to generate reports:', error);
    }

    // Print final summary
    const stats = runner.getOverallStats();
    console.log('\n===========================================');
    console.log('  Final Results');
    console.log('===========================================');
    console.log(`  Total:    ${stats.total}`);
    console.log(`  Passed:   ${stats.passed} (${(stats.passed/stats.total*100).toFixed(1)}%)`);
    console.log(`  Failed:   ${stats.failed}`);
    console.log(`  Skipped:  ${stats.skipped}`);
    console.log('===========================================\n');

    // Exit with appropriate code
    process.exit(stats.failed > 0 ? 1 : 0);
}

// Run main
main().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
});
