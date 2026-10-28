// Pure progression calculations: no browser APIs, storage, or UI side effects.
// Browser: FitQuestProgression.createProgression(FitQuestConfig)
// Node: require('./progression.js').createProgression(config)
(function (root) {
  'use strict';

  function createProgression(config) {
    const maxSkillLevel = config.maxSkillLevel;
    const minTotalLevel = config.skills.length;
    const maxTotalLevel = maxSkillLevel * config.skills.length;

    // Index is the level; value is cumulative XP required to reach it.
    // Match WriteQuest: each level costs ceil(5 * 1.029 ** (level - 1)).
    const xpThresholds = Array(maxSkillLevel + 1).fill(0);
    for (let skillLevel = 2; skillLevel <= maxSkillLevel; skillLevel++) {
      xpThresholds[skillLevel] = xpThresholds[skillLevel - 1] +
        Math.ceil(config.xp.firstLevelCost * Math.pow(config.xp.growthRate, skillLevel - 2));
    }

    function levelForXP(experience) {
      let skillLevel = 1;
      while (skillLevel < maxSkillLevel && experience >= xpThresholds[skillLevel + 1])
        skillLevel++;
      return skillLevel;
    }

    // Milestone bonuses replace previous bonuses rather than stacking.
    function bonusForLevel(skillLevel) {
      let bonus = 0;
      for (const milestone of config.bonusMilestones) {
        if (skillLevel < milestone.level) break;
        bonus = milestone.xp;
      }
      return bonus;
    }

    // Call with the level before awarding this check-in's XP.
    function experienceForCheckIn(score, skillLevel) {
      return score === 0 ? 0 : score + bonusForLevel(skillLevel);
    }

    function calculateTotalLevel(skillProgress) {
      return skillProgress.reduce((total, skill) => total + levelForXP(skill.xp), 0);
    }

    function rewardForTotalLevel(totalLevel) {
      let reward = config.totalRewards[0];
      for (const milestone of config.totalRewards) {
        if (totalLevel < milestone.level) break;
        reward = milestone;
      }
      return reward;
    }

    function nextRewardForTotalLevel(totalLevel) {
      return config.totalRewards.find((milestone) => milestone.level > totalLevel) || null;
    }

    return {
      maxSkillLevel, minTotalLevel, maxTotalLevel, xpThresholds,
      levelForXP, bonusForLevel, experienceForCheckIn, calculateTotalLevel,
      rewardForTotalLevel, nextRewardForTotalLevel,
    };
  }

  const api = { createProgression };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FitQuestProgression = api;
})(globalThis);
