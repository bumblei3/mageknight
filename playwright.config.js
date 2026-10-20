// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    testMatch: '**/*.spec.js',
    timeout: 60000,
    expect: {
        timeout: 10000
    },
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    // 49 spec files at ~9.7 min serial was the CI long pole; two workers halve
    // it. Keep it at 2 so the shared Vite dev server and the runner CPU stay
    // comfortable (flaky timing assertions are worse than a slow job).
    workers: process.env.CI ? 2 : 1,
    reporter: 'html',
    use: {
        actionTimeout: 30000,
        baseURL: 'http://localhost:8081/mageknight/',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ],
    webServer: {
        command: 'vite --port 8081',
        port: 8081,
        reuseExistingServer: !process.env.CI,
        stdout: 'ignore',
        stderr: 'pipe',
        timeout: 60000,
    },
});