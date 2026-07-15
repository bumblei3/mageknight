import { describe, it, expect } from 'vitest';
import { HERO_SKILLS, SKILLS, getRandomSkills } from '../js/skills/skillDefinitions.js';
import { LevelUpManager } from '../js/game/LevelUpManager.js';
import { HeroController } from '../js/game/HeroController.js';

// These tests lock in the fix for the hard-coded 'goldyx' skill offer:
// getRandomSkills must use the ACTUAL hero.id, so arythea/tovak get their own skills.
// They also assert the new skill groups exist (Gap A from CONTENT_GAP_REPORT.md).

describe('Hero Skills — hero.id-driven skill offers (Gap A fix)', () => {
  it('defines skill groups for all 4 heroes', () => {
    const ids = Object.keys(HERO_SKILLS);
    expect(ids.sort()).toEqual(['arythea', 'goldyx', 'norowas', 'tovak']);
    for (const id of ids) {
      expect(HERO_SKILLS[id].common.length).toBeGreaterThan(0);
    }
  });

  it('arythea skill group is chaos/pain themed', () => {
    const ids = HERO_SKILLS.arythea.common.map(s => s.id);
    expect(ids).toEqual(['blood_rage', 'pain_weave', 'dark_pact', 'chaos_embrace']);
  });

  it('tovak skill group is defense/tactics themed', () => {
    const ids = HERO_SKILLS.tovak.common.map(s => s.id);
    expect(ids).toEqual(['iron_wall', 'tactical_read', 'counter_strike', 'bulwark']);
  });

  it('SKILLS uppercase mirror includes the new heroes', () => {
    expect(SKILLS.ARYTHEA.length).toBe(4);
    expect(SKILLS.TOVAK.length).toBe(4);
    expect(SKILLS.GOLDYX.length).toBe(4);
    expect(SKILLS.NOROWAS.length).toBe(4);
  });

  it('getRandomSkills returns the HERO-SPECIFIC pool, not goldyx', () => {
    // Owned set excludes all goldyx skills so the offer must come from the requested hero.
    const owned = new Set(HERO_SKILLS.goldyx.common.map(s => s.id));
    const ary = getRandomSkills('arythea', owned, 2);
    expect(ary.length).toBe(2);
    for (const s of ary) {
      expect(HERO_SKILLS.arythea.common.map(x => x.id)).toContain(s.id);
    }
    const tov = getRandomSkills('tovak', owned, 2);
    for (const s of tov) {
      expect(HERO_SKILLS.tovak.common.map(x => x.id)).toContain(s.id);
    }
  });

  it('LevelUpManager offers skills for the actual hero.id (not hard-coded goldyx)', () => {
    const game = {
      hero: { id: 'arythea', skills: [] },
      ui: null,
      isTestEnvironment: true,
      addLog: () => {},
    };
    const mgr = new LevelUpManager(game);
    // Spy renderSkills to capture the offered skill ids.
    let offered = [];
    mgr.renderSkills = (skills) => { offered = skills.map(s => s.id); };
    mgr.renderCards = () => {};
    mgr.handleLevelUp({ leveledUp: true, newLevel: 2 });
    expect(offered.length).toBeGreaterThan(0);
    for (const id of offered) {
      expect(HERO_SKILLS.arythea.common.map(s => s.id)).toContain(id);
    }
  });

  it('HeroController.triggerLevelUp offers skills for the actual hero.id', () => {
    const offered = [];
    const game = {
      hero: { id: 'tovak', skills: [] },
      ui: {
        showLevelUpModal: (_lvl, data, _cb) => {
          for (const s of data.skills) offered.push(s.id);
        }
      },
      addLog: () => {},
    };
    const ctl = new HeroController(game);
    ctl.triggerLevelUp(2);
    expect(offered.length).toBe(2);
    for (const id of offered) {
      expect(HERO_SKILLS.tovak.common.map(s => s.id)).toContain(id);
    }
  });
});
