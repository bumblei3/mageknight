import { describe, it, expect, beforeEach } from './testRunner.js';
import { logger, LOG_LEVELS } from '../js/logger.js';
import { createSpy } from './test-mocks.js';

describe('Logger', () => {
    beforeEach(() => {
        logger.clearListeners();
        logger.clear();
        logger.setLevel(LOG_LEVELS.DEBUG);
        logger.enabled = true;
    });

    it('should log messages at correct levels', () => {
        const spy = createSpy();
        logger.addListener(spy);

        logger.info('Info message');
        logger.debug('Debug message');
        logger.warn('Warn message');
        logger.error('Error message');
        logger.verbose('Verbose message'); // Should NOT log by default (level is DEBUG=1)

        expect(spy.callCount).toBe(4);
        expect(spy.calls[0][0].message).toBe('Info message');
        expect(spy.calls[0][0].levelName).toBe('INFO');
        expect(spy.calls[1][0].message).toBe('Debug message');
        expect(spy.calls[1][0].levelName).toBe('DEBUG');
    });

    it('should filter logs based on level', () => {
        const spy = createSpy();
        logger.addListener(spy);

        logger.setLevel(LOG_LEVELS.WARN);
        logger.info('Should not log');
        logger.warn('Should log');

        expect(spy.callCount).toBe(1);
        expect(spy.calls[0][0].message).toBe('Should log');
    });

    it('should handle data objects', () => {
        const spy = createSpy();
        logger.addListener(spy);
        const data = { foo: 'bar' };

        logger.info('Message with data', data);

        expect(spy.calls[0][0].data).toBe(data);
    });

    it('should limit log buffer size', () => {
        logger.maxLogs = 5;
        for (let i = 0; i < 10; i++) {
            logger.info(`Msg ${i}`);
        }
        expect(logger.logs.length).toBe(5);
        expect(logger.logs[0].message).toBe('Msg 5');
        expect(logger.logs[4].message).toBe('Msg 9');
    });

    it('should clear logs and notify listeners', () => {
        const spy = createSpy();
        logger.info('Existing log');
        logger.addListener(spy);

        logger.clear();

        expect(logger.logs.length).toBe(0);
        expect(spy.called).toBe(true);
        expect(spy.calls[0][0]).toBeNull();
    });

    it('should disable logging when enabled is false', () => {
        const spy = createSpy();
        logger.addListener(spy);
        logger.enabled = false;

        logger.info('Hidden message');

        expect(spy.called).toBe(false);
    });

    it('should correctly format console output with data', () => {
        // Mock console.log to verify printToConsole
        const originalLog = console.log;
        const logSpy = createSpy();
        console.log = logSpy;

        try {
            logger.info('Test console with data', { x: 1 });
            expect(logSpy.called).toBe(true);
            expect(logSpy.calls[0][2]).toEqual({ x: 1 });

            // Trigger Verbose style
            logger.setLevel(LOG_LEVELS.VERBOSE);
            logger.verbose('Verbose console');
            expect(logSpy.callCount).toBe(2);

            // Trigger Default style (using unknown level)
            logger.log(99, 'Default style');
            expect(logSpy.callCount).toBe(3);
        } finally {
            console.log = originalLog;
        }
    });
});
