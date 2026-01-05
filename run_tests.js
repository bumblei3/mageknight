import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Dynamically find all test files
// Dynamically find all test files recursively
function getTestFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getTestFiles(file));
        } else if (file.endsWith('.test.js')) {
            results.push('./' + file); // Ensure relative path format
        }
    });
    return results;
}

const allTestFiles = getTestFiles('./tests');

// Parse args
const args = process.argv.slice(2);
let shardIndex = 0;
let totalShards = 1;
const workerArgs = [];
const specificFiles = [];

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--grep' && i + 1 < args.length) {
        const pattern = args[i + 1];
        workerArgs.push('--grep', pattern);
        i++;
    } else if (args[i].startsWith('--shard=')) {
        const parts = args[i].split('=')[1].split('/');
        shardIndex = parseInt(parts[0], 10) - 1;
        totalShards = parseInt(parts[1], 10);
    } else if (args[i] === '--shard' && i + 1 < args.length) {
        const parts = args[i + 1].split('/');
        shardIndex = parseInt(parts[0], 10) - 1;
        totalShards = parseInt(parts[1], 10);
        i++;
    } else if (!args[i].startsWith('-')) {
        // Assume positional arg is a file path
        specificFiles.push(args[i]);
    }
}

// Determine files to run
let filesToRun = [];

if (specificFiles.length > 0) {
    // Run only requested files
    filesToRun = specificFiles;
} else {
    // Run all found test files
    filesToRun = allTestFiles;
}

// Apply sharding
if (totalShards > 1) {
    const chunkStats = Math.ceil(filesToRun.length / totalShards);
    const start = shardIndex * chunkStats;
    const end = Math.min(start + chunkStats, filesToRun.length);
    filesToRun = filesToRun.slice(start, end);
}

console.log(`Arguments: ${JSON.stringify(args)}`);
console.log(`Sharding Config: Shard ${shardIndex + 1} of ${totalShards}`);
console.log(`Running ${filesToRun.length} files out of ${allTestFiles.length}`);

// Parallel Execution Config
const MAX_CONCURRENCY = process.env.MAX_CONCURRENCY ? parseInt(process.env.MAX_CONCURRENCY) : Math.max(1, (await import('os')).cpus().length - 1);

console.log(`Starting execution with process isolation... (Concurrency: ${MAX_CONCURRENCY})`);

let totalPassedFiles = 0;
let totalFailedFiles = 0;
let completedFiles = 0;
const failedFilesList = [];

async function runFile(file) {
    return new Promise((resolve) => {
        const child = spawn('node', ['--expose-gc', 'run_tests_worker.js', file, ...workerArgs], {
            stdio: 'inherit',
            env: { ...process.env, FORCE_COLOR: '1' }
        });

        child.on('close', (code) => {
            completedFiles++;
            const progress = `[${completedFiles}/${filesToRun.length}]`;
            if (code === 0) {
                totalPassedFiles++;
                resolve(true);
            } else {
                console.error(`${progress} ❌ Test failed: ${file}`);
                totalFailedFiles++;
                failedFilesList.push(file);
                resolve(false);
            }
        });
    });
}

// Worker Pool Implementation
async function runTestsInParallel(files) {
    const queue = [...files];
    const activeWorkers = new Set();
    const results = [];

    return new Promise((resolve) => {
        const next = () => {
            // Check if done
            if (queue.length === 0 && activeWorkers.size === 0) {
                resolve();
                return;
            }

            // Fill pool
            while (queue.length > 0 && activeWorkers.size < MAX_CONCURRENCY) {
                const file = queue.shift();
                const promise = runFile(file).then(() => {
                    activeWorkers.delete(promise);
                    next();
                });
                activeWorkers.add(promise);
            }
        };

        next();
    });
}

const startTime = Date.now();
await runTestsInParallel(filesToRun);
const duration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('\n=============================================');
console.log(`Global Results: Files Passed: ${totalPassedFiles} | Files Failed: ${totalFailedFiles}`);
if (totalFailedFiles > 0) {
    console.log('Failed Files:');
    failedFilesList.forEach(f => console.log(` - ${f}`));
}
console.log(`Time Taken: ${duration}s`);
console.log('=============================================');

if (totalFailedFiles > 0) {
    process.exit(1);
}
