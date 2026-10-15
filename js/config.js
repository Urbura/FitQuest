// FitQuest editable configuration. Loaded before fitville.js.
// IMPORTANT: Skill array positions identify existing saved progress; never reorder skills.
// Change skillDisplayOrder to rearrange the interface.
// Milestones must remain sorted from lowest to highest.
// Daily reset uses fixed UTC time: 09:30 UTC is 03:30 CST (UTC-6), year-round.
globalThis.FitQuestConfig = {
  "dailyQuests": [
  [
    "Begin your bedtime routine 15 minutes earlier.",
    "Put your phone away 15 minutes before bed.",
    "Spend five minutes reading before bed.",
    "Dim the lights during your bedtime routine.",
    "Spend two minutes breathing calmly before bed.",
    "Set aside five minutes to wind down.",
    "Write down tomorrow’s tasks before winding down.",
    "Make your sleeping space comfortably dark.",
    "Make your bedroom comfortably cool.",
    "Keep your planned bedtime tonight."
  ],
  [
    "Drink a glass of water.",
    "Add a vegetable to a meal.",
    "Eat a serving of fruit.",
    "Include a protein source in one meal.",
    "Choose a whole-grain food for one meal.",
    "Prepare a balanced snack.",
    "Eat one meal without looking at a screen.",
    "Prepare fruit or vegetables for tomorrow.",
    "Plan one balanced meal for tomorrow."
  ],
  [
    "Stretch gently for five minutes.",
    "Stretch your calves for 30 seconds per side.",
    "Stretch your thighs for 30 seconds per side.",
    "Stretch your hips gently for two minutes.",
    "Stretch your wrists and forearms for one minute.",
    "Stretch your chest gently for one minute.",
    "Stretch your hamstrings gently for one minute.",
    "Take a two-minute movement and stretching break.",
    "Complete five gentle seated torso rotations per side.",
    "Complete a five-minute stretching routine you enjoy."
  ],
  [
    "Take a five-minute walk.",
    "March in place for three minutes.",
    "Dance to one song.",
    "Walk for five minutes after a meal.",
    "Take a five-minute wheelchair roll.",
    "Cycle at an easy pace for five minutes.",
    "Walk an extra five minutes during an outing.",
    "Do three minutes of comfortable seated cardio.",
    "Walk indoors for five minutes.",
    "Complete five minutes of a cardio activity you enjoy."
  ],
  [
    "Complete 5 wall push-ups.",
    "Complete 5 chair sit-to-stands.",
    "Complete 10 calf raises, using support.",
    "Complete 5 countertop push-ups.",
    "Complete 8 seated knee extensions per leg.",
    "Complete one comfortable set of resistance-band rows.",
    "Complete 5 glute bridges.",
    "Complete one light set of biceps curls.",
    "Hold a wall plank for 15 seconds.",
    "Complete one set of a familiar strength exercise."
  ]
],
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
      "name": "Diet",
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
      "title": "Unranked",
      "badge": "shoe",
      "theme": "sky",
      "themeName": "Sky"
    },
    {
      "level": 10,
      "title": "Bronze",
      "badge": "bottle",
      "theme": "pearl",
      "themeName": "Bronze Dawn"
    },
    {
      "level": 25,
      "title": "Silver",
      "badge": "apple",
      "theme": "rose",
      "themeName": "Silver Horizon"
    },
    {
      "level": 50,
      "title": "Gold",
      "badge": "stretch",
      "theme": "ice",
      "themeName": "Golden Arena"
    },
    {
      "level": 75,
      "title": "Platinum",
      "badge": "rope",
      "theme": "lagoon",
      "themeName": "Platinum Summit"
    },
    {
      "level": 100,
      "title": "Emerald",
      "badge": "dumbbell",
      "theme": "ocean",
      "themeName": "Emerald Sanctuary"
    },
    {
      "level": 150,
      "title": "Diamond",
      "badge": "heart",
      "theme": "meadow",
      "themeName": "Diamond Sky"
    },
    {
      "level": 200,
      "title": "Master",
      "badge": "kettlebell",
      "theme": "lavender",
      "themeName": "Master Ascension"
    },
    {
      "level": 250,
      "title": "Grandmaster",
      "badge": "trophy",
      "theme": "sunrise",
      "themeName": "Grandmaster Radiance"
    }
  ],
  "themeArtwork": {
    "sky": "assets/backgrounds/sky.svg",
    "pearl": "assets/backgrounds/pearl.svg",
    "rose": "assets/backgrounds/rose.svg",
    "ice": "assets/backgrounds/ice.svg",
    "lagoon": "assets/backgrounds/lagoon.svg",
    "ocean": "assets/backgrounds/ocean.svg",
    "meadow": "assets/backgrounds/meadow.svg",
    "lavender": "assets/backgrounds/lavender.svg",
    "sunrise": "assets/backgrounds/sunrise.svg"
  },
  "themes": {
    "sky": "radial-gradient(ellipse at 50% 45%, #f3fcffde 0%, #e9f8ffb8 36%, #e9f8ff00 82%)",
    "pearl": "radial-gradient(ellipse at 50% 45%, #fff9efde 0%, #fff9efb8 36%, #fff9ef00 82%)",
    "rose": "radial-gradient(ellipse at 50% 45%, #f5faffde 0%, #f5faffb8 36%, #f5faff00 82%)",
    "ice": "radial-gradient(ellipse at 50% 45%, #fffbe9de 0%, #fffbe9b8 36%, #fffbe900 82%)",
    "lagoon": "radial-gradient(ellipse at 50% 45%, #f0ffffde 0%, #f0ffffb8 36%, #f0ffff00 82%)",
    "ocean": "radial-gradient(ellipse at 50% 45%, #f0fff6de 0%, #f0fff6b8 36%, #f0fff600 82%)",
    "meadow": "radial-gradient(ellipse at 50% 45%, #f2fbffde 0%, #f2fbffb8 36%, #f2fbff00 82%)",
    "lavender": "radial-gradient(ellipse at 50% 45%, #fff6ffde 0%, #fff6ffb8 36%, #fff6ff00 82%)",
    "sunrise": "radial-gradient(ellipse at 50% 45%, #fff9eade 0%, #fff9eab8 36%, #fff9ea00 82%)"
  }
};
