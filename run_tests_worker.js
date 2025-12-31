import { runner } from './tests/testRunner.js';
import { resetMocks } from './tests/test-mocks.js';
import './tests/setup.js';
import path from 'path';

// Get test file from arguments
const testFile = process.argv[2];

if (!testFile) {
    console.error('No test file specified');
    process.exit(1);
}

// Global cleanup after each test
// (We re-import setup.js which might set up some things, but this clean slate is good)

async function runWorker() {
    try {
        if (global.gc) global.gc();

        // Dynamically import the test file
        const importPath = testFile.startsWith('./') || testFile.startsWith('/') ? testFile : './' + testFile;
        await import(path.resolve(process.cwd(), testFile));

        // Run the tests
        // We do NOT use noExit: true here because we WANT to exit this process based on result
        // But we want to format the output nicely first.
        const result = await runner.run({
            // You can pass options like grep here if passed via argv
        });

        // The runner prints its own output.
        // We just need to exit with the correct code.
        const exitCode = result.failed > 0 ? 1 : 0;
        process.exit(exitCode);

    } catch (error) {
        console.error(`Error running ${testFile}:`, error);
        process.exit(1);
    }
}

runWorker();
