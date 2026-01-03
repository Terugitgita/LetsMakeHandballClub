#!/usr/bin/env node
// pdca-cli.js - PDCA Analysis CLI
// Usage: node cli/pdca-cli.js [options]
//   --version=XX   Version number for input/output files (e.g., --version=01)
//   --input=PATH   Path to test-results.json (overrides --version)
//   --output=PATH  Path for PDCA report output (overrides --version)

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { runPDCAAnalysis } from './pdca-analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const docsDir = join(__dirname, '..', 'docs');

// Parse arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        version: null,
        input: null,
        output: null
    };

    args.forEach(arg => {
        if (arg.startsWith('--version=')) {
            options.version = arg.split('=')[1].padStart(2, '0');
        } else if (arg.startsWith('--input=')) {
            options.input = arg.split('=')[1];
        } else if (arg.startsWith('--output=')) {
            options.output = arg.split('=')[1];
        }
    });

    // Set defaults based on version
    if (!options.input) {
        if (options.version) {
            options.input = join(docsDir, `test-results-${options.version}.json`);
        } else {
            options.input = join(docsDir, 'test-results-02.json');
        }
    }

    if (!options.output) {
        if (options.version) {
            options.output = join(docsDir, `pdca-report-${options.version}.md`);
        } else {
            options.output = join(docsDir, 'pdca-report.md');
        }
    }

    return options;
}

// Main
async function main() {
    const options = parseArgs();

    console.log('\n===========================================');
    console.log('  ズッキュン中学物語 - PDCA Analysis');
    if (options.version) {
        console.log(`  Version: ${options.version}`);
    }
    console.log('===========================================\n');

    console.log(`Input: ${options.input}`);
    console.log(`Output: ${options.output}`);

    try {
        await runPDCAAnalysis(options.input, options.output);
        console.log('\nPDCA analysis completed successfully.');
    } catch (error) {
        console.error('\nPDCA analysis failed:', error.message);
        process.exit(1);
    }
}

main();
