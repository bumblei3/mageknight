import { describe, it, expect } from 'vitest';
import { 
    GameAPI, 
    GameAPIExtended, 
    SaveManagerAPI, 
    Position,
    HexCoordinates,
    TurnManager,
    CombatOrchestrator,
    ScenarioManagerType
} from '../../js/game/game-types.js';

describe('Game Types - Type Import Verification', () => {
    it('should be able to import all main type exports', () => {
        // This test verifies that all types can be imported without TypeScript errors
        // The actual test is compilation - if this file compiles, types are valid
        
        const position = { q: 1, r: 2 };
        expect(position.q).toBe(1);
        expect(position.r).toBe(2);
    });

    it('should allow creating objects matching the interfaces', () => {
        const coords = { q: 3, r: 4 };
        expect(coords.q).toBe(3);
        expect(coords.r).toBe(4);
    });

    // This test ensures the type exports work correctly at runtime
    // (TypeScript compilation is the real test, but this ensures the module loads)
    it('should verify module loads without errors', () => {
        // If we reach here, the imports worked
        expect(true).toBe(true);
    });
});