import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');

// Ensure dist directory exists
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

console.log('Building project...');

// Copy static files
const filesToCopy = ['index.html', 'manifest.json', 'sw.js', 'favicon.png'];
filesToCopy.forEach(file => {
    if (fs.existsSync(path.join(__dirname, file))) {
        fs.copyFileSync(path.join(__dirname, file), path.join(distDir, file));
    }
});

// Copy directories
const dirsToCopy = ['css', 'js', 'assets', 'icons'];
dirsToCopy.forEach(dir => {
    const srcDir = path.join(__dirname, dir);
    const destDir = path.join(distDir, dir);

    if (fs.existsSync(srcDir)) {
        fs.cpSync(srcDir, destDir, { recursive: true });
    }
});

// Minify CSS
console.log('Minifying CSS...');
try {
    // Find all CSS files in dist and minify them in place
    execSync(`find dist -name "*.css" -exec npx cleancss -o {} {} \\;`, { stdio: 'inherit' });
} catch (e) {
    console.error('CSS Minification failed:', e.message);
}

// Minify JS
console.log('Minifying JS...');
try {
    // Find all JS files in dist and minify them in place
    execSync(`find dist/js -name "*.js" -exec npx terser {} --module -o {} \\;`, { stdio: 'inherit' });
} catch (e) {
    console.error('JS Minification failed:', e.message);
}

console.log('Build complete!');
