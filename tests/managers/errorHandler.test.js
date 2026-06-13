import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandler } from '../../js/errorHandler.js';
import { logger } from '../../js/logger.js';

describe('ErrorHandler', () => {
    let mockGame;
    let errorHandler;

    beforeEach(() => {
        mockGame = {
            showToast: vi.fn(),
            addLog: vi.fn()
        };
        errorHandler = new ErrorHandler(mockGame);
    });

    describe('constructor', () => {
        it('should initialize with empty errors array', () => {
            expect(errorHandler.getErrors()).toEqual([]);
            expect(errorHandler.getErrorCount()).toBe(0);
        });

        it('should set maxErrors to 50', () => {
            for (let i = 0; i < 55; i++) {
                errorHandler.handleError({ type: 'test', message: `Error ${i}` });
            }
            expect(errorHandler.getErrorCount()).toBe(50);
        });
    });

    describe('handleError', () => {
        it('should store error with timestamp', () => {
            const errorInfo = { type: 'test', message: 'Test error' };
            errorHandler.handleError(errorInfo);

            const errors = errorHandler.getErrors();
            expect(errors.length).toBe(1);
            expect(errors[0].type).toBe('test');
            expect(errors[0].message).toBe('Test error');
            expect(errors[0].timestamp).toBeDefined();
            expect(new Date(errors[0].timestamp)).toBeInstanceOf(Date);
        });

        it('should include filename, line, col when provided', () => {
            const errorInfo = {
                type: 'error',
                message: 'Script error',
                filename: 'test.js',
                line: 42,
                col: 10,
                stack: 'Error stack trace'
            };
            errorHandler.handleError(errorInfo);

            const errors = errorHandler.getErrors();
            expect(errors[0].filename).toBe('test.js');
            expect(errors[0].line).toBe(42);
            expect(errors[0].col).toBe(10);
            expect(errors[0].stack).toBe('Error stack trace');
        });

        it('should call logger.error', () => {
            const loggerSpy = vi.spyOn(logger, 'error');
            errorHandler.handleError({ type: 'test', message: 'Test error' });
            expect(loggerSpy).toHaveBeenCalledWith('[test] Test error');
        });

        it('should call game.showToast when available', () => {
            errorHandler.handleError({ type: 'test', message: 'Test error' });
            expect(mockGame.showToast).toHaveBeenCalledWith(
                'Ein Fehler ist aufgetreten. Siehe Konsole für Details.',
                'error'
            );
        });

        it('should call game.addLog when available', () => {
            errorHandler.handleError({ type: 'test', message: 'Test error' });
            expect(mockGame.addLog).toHaveBeenCalledWith('Fehler: Test error', 'error');
        });

        it('should not throw when game is undefined', () => {
            const handlerWithoutGame = new ErrorHandler(undefined);
            expect(() => handlerWithoutGame.handleError({ type: 'test', message: 'Test error' })).not.toThrow();
        });
    });

    describe('getErrors', () => {
        it('should return copy of errors array', () => {
            errorHandler.handleError({ type: 'test1', message: 'Error 1' });
            errorHandler.handleError({ type: 'test2', message: 'Error 2' });

            const errors1 = errorHandler.getErrors();
            const errors2 = errorHandler.getErrors();

            expect(errors1).not.toBe(errors2);
            expect(errors1).toEqual(errors2);
        });

        it('should return empty array when no errors', () => {
            expect(errorHandler.getErrors()).toEqual([]);
        });
    });

    describe('clearErrors', () => {
        it('should clear all errors', () => {
            errorHandler.handleError({ type: 'test', message: 'Error 1' });
            errorHandler.handleError({ type: 'test', message: 'Error 2' });
            expect(errorHandler.getErrorCount()).toBe(2);

            errorHandler.clearErrors();
            expect(errorHandler.getErrorCount()).toBe(0);
            expect(errorHandler.getErrors()).toEqual([]);
        });
    });

    describe('getErrorCount', () => {
        it('should return correct count', () => {
            expect(errorHandler.getErrorCount()).toBe(0);
            errorHandler.handleError({ type: 'test', message: 'Error 1' });
            expect(errorHandler.getErrorCount()).toBe(1);
            errorHandler.handleError({ type: 'test', message: 'Error 2' });
            expect(errorHandler.getErrorCount()).toBe(2);
        });
    });

    describe('maxErrors limit', () => {
        it('should remove oldest errors when exceeding maxErrors', () => {
            for (let i = 0; i < 55; i++) {
                errorHandler.handleError({ type: 'test', message: `Error ${i}` });
            }

            const errors = errorHandler.getErrors();
            expect(errors.length).toBe(50);
            expect(errors[0].message).toBe('Error 5');
            expect(errors[49].message).toBe('Error 54');
        });
    });
});