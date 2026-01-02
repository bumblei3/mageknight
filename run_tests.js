import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Dynamically find all test files
const allTestFiles = fs.readdirSync('./tests')
    .filter(f => f.endsWith('.test.js'))
    .map(f => './tests/' + f);

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

console.log('Starting execution with process isolation...');

let totalPassedFiles = 0;
let totalFailedFiles = 0;

async function runFile(file) {
    return new Promise((resolve) => {
        // console.log(`\n🚀 Spawning worker for ${file}...`);

        const child = spawn('node', ['--expose-gc', 'run_tests_worker.js', file, ...workerArgs], {
            stdio: 'inherit', // Stream output directly to parent console
            env: process.env
        });

        child.on('close', (code) => {
            if (code === 0) {
                totalPassedFiles++;
                resolve(true);
            } else {
                console.error(`❌ Test failed: ${file}`);
                totalFailedFiles++;
                resolve(false);
            }
        });
    });
}

// Run sequentially to keep memory low and output readable
for (const file of filesToRun) {
    await runFile(file);
}

console.log('\n=============================================');
console.log(`Global Results: Files Passed: ${totalPassedFiles} | Files Failed: ${totalFailedFiles}`);
console.log('=============================================');

if (totalFailedFiles > 0) {
    process.exit(1);
}
