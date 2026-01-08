import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeManager } from '../../js/timeManager';
import { eventBus } from '../../js/eventBus';
import { GAME_EVENTS, TIME_OF_DAY } from '../../js/constants';

describe('TimeManager Events', () => {
    let timeManager;

    beforeEach(() => {
        timeManager = new TimeManager();
        vi.spyOn(eventBus, 'emit');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should emit TIME_CHANGED when toggling time', () => {
        timeManager.loadState({ round: 1, timeOfDay: TIME_OF_DAY.DAY });

        // Clear mocks after loadState emission
        vi.clearAllMocks();

        timeManager.toggleTime();

        expect(timeManager.isDay()).toBe(false);
        expect(eventBus.emit).toHaveBeenCalledWith(GAME_EVENTS.TIME_CHANGED, {
            round: 1,
            timeOfDay: TIME_OF_DAY.NIGHT
        });
    });

    it('should increment round when calling endRound', () => {
        timeManager.loadState({ round: 1, timeOfDay: TIME_OF_DAY.DAY });
        vi.clearAllMocks();

        timeManager.endRound();

        expect(timeManager.getState().round).toBe(2);
        expect(eventBus.emit).toHaveBeenCalledWith(GAME_EVENTS.TIME_CHANGED, expect.objectContaining({
            round: 2,
            timeOfDay: TIME_OF_DAY.NIGHT
        }));
    });
});
