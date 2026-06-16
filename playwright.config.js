// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    timeout: 60000,
    expect: {
        timeout: 10000
    },
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    workers: 1,
    reporter: 'html',
    use: {
        actionTimeout: 0,
        baseURL: 'http://localhost:8081/mageknight/',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] }
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] }
        },
        {
            name: 'visual-chromium',
            use: { ...devices['Desktop Chrome'] },
            testMatch: /.*visual-regression.*\.test\.ts/
        },
        {
            name: 'visual-firefox',
            use: { ...devices['Desktop Firefox'] },
            testMatch: /.*visual-regression.*\.test\.ts/
        }
    ],
    webServer: {
        command: 'vite --port 8081',
        port: 8081,
        reuseExistingServer: !process.env.CI,
        stdout: 'ignore',
        stderr: 'pipe',
    },
});