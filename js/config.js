// FitQuest editable configuration. Loaded before fitville.js.
// IMPORTANT: Skill array positions identify existing saved progress; never reorder skills.
// Change skillDisplayOrder to rearrange the interface.
// Milestones must remain sorted from lowest to highest.
// Daily reset uses fixed UTC time: 09:30 UTC is 03:30 CST (UTC-6), year-round.
globalThis.FitQuestConfig = {
  "maxSkillLevel": 50,
  "xp": {
    "firstLevelCost": 5,
    "costIncrease": 1
  },
  "bonusMilestones": [
    {
      "level": 10,
      "xp": 1
    },
    {
      "level": 20,
      "xp": 2
    },
    {
      "level": 30,
      "xp": 3
    },
    {
      "level": 40,
      "xp": 4
    }
  ],
  "dailyReset": {
    "utcHour": 9,
    "utcMinute": 30,
    "label": "3:30 a.m. CST (UTC−6)"
  },
  "skillDisplayOrder": [
    4,
    3,
    2,
    1,
    0
  ],
  "skills": [
    {
      "name": "Sleep",
      "hint": "How close were you to your 7½–8½ hour sleep goal?",
      "icon": "moon",
      "color": "#7962a6",
      "titles": [
        "Dreamer",
        "Rest Seeker",
        "Moon Walker",
        "Night Guardian",
        "Dream Weaver",
        "Rest Keeper",
        "Moonlight Adept"
      ],
      "masteryTitle": "Dream Ascendant",
      "crown": "Moonlight Crown",
      "crownSymbol": "☾"
    },
    {
      "name": "Healthy Eating",
      "hint": "How well did you meet your eating goals today?",
      "icon": "salad",
      "color": "#4f7836",
      "titles": [
        "Fresh Starter",
        "Balanced Bite",
        "Nourished Explorer",
        "Garden Guardian",
        "Balanced Builder",
        "Nourishment Keeper",
        "Harvest Adept"
      ],
      "masteryTitle": "Nourishment Ascendant",
      "crown": "Harvest Crown",
      "crownSymbol": "✿"
    },
    {
      "name": "Stretching",
      "hint": "How well did you meet your stretching goal today?",
      "icon": "stretching",
      "color": "#267b7d",
      "titles": [
        "First Stretch",
        "Limber Learner",
        "Flow Seeker",
        "Flexible Explorer",
        "Flow Adept",
        "Mobility Keeper",
        "Balance Adept"
      ],
      "masteryTitle": "Flow Ascendant",
      "crown": "Harmony Crown",
      "crownSymbol": "◇"
    },
    {
      "name": "Cardio",
      "hint": "How well did you meet your movement or cardio goal today?",
      "icon": "run",
      "color": "#ad5b28",
      "titles": [
        "Trail Starter",
        "Steady Strider",
        "Distance Seeker",
        "Swift Runner",
        "Endurance Adept",
        "Trail Keeper",
        "Fleetfoot"
      ],
      "masteryTitle": "Wind Ascendant",
      "crown": "Wind Crown",
      "crownSymbol": "ϟ"
    },
    {
      "name": "Strength",
      "hint": "How well did you follow your workout plan today?",
      "icon": "barbell",
      "color": "#3b6daa",
      "titles": [
        "First Lift",
        "Iron Learner",
        "Power Builder",
        "Iron Guardian",
        "Strength Adept",
        "Power Keeper",
        "Ironheart"
      ],
      "masteryTitle": "Iron Ascendant",
      "crown": "Iron Crown",
      "crownSymbol": "◆"
    }
  ],
  "totalRewards": [
    {
      "level": 5,
      "title": "Habit Starter",
      "badge": "shoe",
      "theme": "sky",
      "themeName": "Sky"
    },
    {
      "level": 10,
      "title": "Habit Beginner",
      "badge": "bottle",
      "theme": "pearl",
      "themeName": "Pearl"
    },
    {
      "level": 25,
      "title": "Habit Pathfinder",
      "badge": "apple",
      "theme": "rose",
      "themeName": "Rose"
    },
    {
      "level": 50,
      "title": "Habit Explorer",
      "badge": "stretch",
      "theme": "ice",
      "themeName": "Ice Blue"
    },
    {
      "level": 75,
      "title": "Habit Wayfinder",
      "badge": "rope",
      "theme": "lagoon",
      "themeName": "Lagoon"
    },
    {
      "level": 100,
      "title": "Habit Builder",
      "badge": "dumbbell",
      "theme": "ocean",
      "themeName": "Ocean"
    },
    {
      "level": 150,
      "title": "Habit Keeper",
      "badge": "heart",
      "theme": "meadow",
      "themeName": "Meadow"
    },
    {
      "level": 200,
      "title": "Habit Guardian",
      "badge": "kettlebell",
      "theme": "lavender",
      "themeName": "Lavender"
    },
    {
      "level": 250,
      "title": "Habit Champion",
      "badge": "trophy",
      "theme": "sunrise",
      "themeName": "Sunrise"
    }
  ],
  "themes": {
    "sky": "linear-gradient(145deg, #93d8fc, #c8eeff)",
    "ocean": "linear-gradient(145deg, #65cbdc, #b9eef4)",
    "meadow": "linear-gradient(145deg, #89d19b, #d0f1ad)",
    "lavender": "linear-gradient(145deg, #b69be8, #e6cef9)",
    "sunrise": "linear-gradient(145deg, #ffbd72, #ffe1a3)",
    "ice": "linear-gradient(145deg, #91b8ed, #c9dcff)",
    "pearl": "linear-gradient(145deg, #b7c1d1, #e3e9f4)",
    "rose": "linear-gradient(145deg, #ee9fc1, #ffd3df)",
    "lagoon": "linear-gradient(145deg, #74d4ba, #c0f1dd)"
  }
};
