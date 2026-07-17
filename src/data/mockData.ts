type FriendChallenge = {
  id: string;
  name: string;
  status: string;
  prompt: string;
};

export const dailyChallenges = [
  {
    id: "social-prediction",
    title: "Challenge 1: Treasure Chest",
    tagline: "Play a friend treasure challenge",
    prompt: "Arrange five treasure items and use your intuition to unlock the hidden order from a friend or the computer.",
    choices: ["Sun", "Moon", "Star", "Cloud"],
    answer: "Moon"
  },
  {
    id: "daily-intuition",
    title: "Challenge 2: Train Your Knowing",
    tagline: "Inner knowing practice",
    prompt: "One color is hiding a beautiful image. Quiet your mind, listen for inner knowing, and choose the one calling to you.",
    choices: ["Red", "Green", "Yellow", "Blue"],
    answer: "Blue"
  },
  {
    id: "remote-viewing-arena",
    title: "Challenge 3: Positivity Practice",
    tagline: "Daily gratitude and kindness",
    prompt: "Try one simple task that builds positivity, gratitude, kindness, or calm in real life.",
    choices: [],
    answer: "Completed"
  },
  {
    id: "third-eye-activation",
    title: "Challenge 4: Read the Person",
    tagline: "Awareness beyond the obvious",
    prompt: "Use awareness and self-discovery to sense three true attributes about a real public or historical person.",
    choices: [],
    answer: "Completed"
  },
  {
    id: "psychic-potential-score",
    title: "Challenge 5: Daily Astrology Tips",
    tagline: "Personal growth guidance",
    prompt: "Receive three birth-chart insights, then create a personal self-challenge that supports growth, consciousness, and spiritual awakening.",
    choices: [],
    answer: "Completed"
  },
  {
    id: "remote-viewing-test",
    title: "Challenge 6: Remote Viewing Challenge",
    tagline: "Remote viewing practice",
    prompt: "Draw your impressions, practice remote viewing, and notice what your sixth sense reveals before the image appears.",
    choices: [],
    answer: "Completed"
  }
];

const learningPromptThemes = [
  "gratitude",
  "kindness",
  "quiet reflection",
  "hope",
  "appreciation",
  "connection",
  "self-encouragement",
  "simple joy",
  "helping someone",
  "dreams for the future",
  "peace at home",
  "positive memories",
  "fresh air",
  "a kind note",
  "small celebrations",
  "letting go",
  "beauty nearby",
  "support",
  "a caring message",
  "thankfulness"
];

const learningPromptFrames = [
  {
    tagline: "Today's positivity task",
    prompt: (theme: string) => `What small task can help you practice ${theme} today?`
  },
  {
    tagline: "Today's gratitude moment",
    prompt: (theme: string) => `How can you bring ${theme} into one ordinary moment today?`
  },
  {
    tagline: "Today's kindness step",
    prompt: (theme: string) => `What kind action can you take that connects with ${theme}?`
  },
  {
    tagline: "Today's reflection prompt",
    prompt: (theme: string) => `What can you write down today to build ${theme}?`
  },
  {
    tagline: "Today's positive action",
    prompt: (theme: string) => `Which small action would make ${theme} feel more real today?`
  },
  {
    tagline: "Today's calm practice",
    prompt: (theme: string) => `Where could two quiet minutes help you notice ${theme}?`
  },
  {
    tagline: "Today's uplifting task",
    prompt: (theme: string) => `What gentle action could lift your mood through ${theme}?`
  },
  {
    tagline: "Today's caring choice",
    prompt: (theme: string) => `What caring choice can you make today around ${theme}?`
  },
  {
    tagline: "Today's calm pause",
    prompt: (theme: string) => `Where would a quiet pause help you feel more ${theme}?`
  },
  {
    tagline: "Today's practice moment",
    prompt: (theme: string) => `What ordinary moment can become a practice for ${theme} today?`
  },
  {
    tagline: "Today's good choice",
    prompt: (theme: string) => `Which choice today could create more ${theme}?`
  },
  {
    tagline: "Today's note to self",
    prompt: (theme: string) => `What note could you write to yourself about ${theme}?`
  },
  {
    tagline: "Today's energy lift",
    prompt: (theme: string) => `How could ${theme} bring a little more energy to your day?`
  },
  {
    tagline: "Today's appreciation task",
    prompt: (theme: string) => `Who or what could you appreciate today through ${theme}?`
  },
  {
    tagline: "Today's real-life step",
    prompt: (theme: string) => `How can you bring ${theme} into one real action before the day ends?`
  }
];

const learningPromptPool = learningPromptThemes.flatMap((theme) =>
  learningPromptFrames.map((frame) => ({
    tagline: frame.tagline,
    prompt: frame.prompt(theme)
  }))
);

const dailyQuestionPools: Record<string, Array<{ tagline: string; prompt: string }>> = {
  "social-prediction": [
    {
      tagline: "Today's treasure question",
      prompt: "Which hidden treasure order can you sense before the chest opens?"
    },
    {
      tagline: "Today's friend challenge",
      prompt: "Can you feel where each treasure belongs in your friend's secret pattern?"
    },
    {
      tagline: "Today's chest pattern",
      prompt: "Which five treasure placements feel most clear before you test the lock?"
    },
    {
      tagline: "Today's intuition unlock",
      prompt: "What arrangement feels like it will open the treasure chest fastest?"
    },
    {
      tagline: "Today's hidden order",
      prompt: "Can your first impression guide the treasures into the right five spaces?"
    },
    {
      tagline: "Today's treasure signal",
      prompt: "Which treasure item feels like it belongs first, second, third, fourth, and fifth?"
    },
    {
      tagline: "Today's chest mystery",
      prompt: "Can you unlock the chest by trusting the order that quietly stands out?"
    }
  ],
  "daily-intuition": [
    {
      tagline: "Today's knowing question",
      prompt: "Which color feels like it is holding the hidden picture today?"
    },
    {
      tagline: "Today's first impression",
      prompt: "Which color do you sense before your thinking mind explains it?"
    },
    {
      tagline: "Today's color signal",
      prompt: "Which color seems calm, clear, or quietly magnetic today?"
    },
    {
      tagline: "Today's image sense",
      prompt: "Which color feels connected to the image waiting underneath?"
    },
    {
      tagline: "Today's quiet choice",
      prompt: "Which color calls to your inner knowing after one slow breath?"
    },
    {
      tagline: "Today's hidden picture",
      prompt: "Which color feels like it is guarding the real-world photograph?"
    },
    {
      tagline: "Today's subtle pull",
      prompt: "Which color has the gentlest pull before you tap?"
    }
  ],
  "remote-viewing-arena": [
    {
      tagline: "Today's gentle idea",
      prompt: "Choose one of two simple intuition-friendly ideas to try today."
    },
    {
      tagline: "Today's positivity practice",
      prompt: "Pick a small action, notice what happens, and return tomorrow to reflect."
    },
    {
      tagline: "Today's awareness task",
      prompt: "Try one light daily prompt that builds mindfulness, insight, and inner knowing."
    },
    {
      tagline: "Today's simple practice",
      prompt: "Choose one easy real-life action, then watch for synchronicity or useful insight."
    }
  ]
};

export function getDailyChallenges(date = new Date()) {
  const dateKey = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");

  return dailyChallenges.map((challenge) => {
    const pool = dailyQuestionPools[challenge.id];
    if (!pool?.length) return challenge;
    const dailyQuestion = pool[Math.abs(hashString(`${dateKey}-${challenge.id}`)) % pool.length];
    return {
      ...challenge,
      tagline: dailyQuestion.tagline,
      prompt: dailyQuestion.prompt
    };
  });
}

function hashString(value: string) {
  return [...value].reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0);
}

export const remoteViewingTarget = {
  imageId: "coastal-light",
  theme: "water",
  title: "Coastal Lighthouse",
  reveal:
    "A white lighthouse above a rocky shoreline, with cold blue water and a narrow path through sea grass."
};

export const remoteViewingOptions = [
  {
    imageId: "forest-path",
    theme: "earth",
    label: "Forest path",
    cue: "Dense green, quiet trail, damp ground"
  },
  {
    imageId: "coastal-light",
    theme: "water",
    label: "Coastal light",
    cue: "Wind, open water, pale structure"
  },
  {
    imageId: "city-rooftop",
    theme: "air",
    label: "City rooftop",
    cue: "Concrete, skyline, warm lights"
  }
];

export const friendChallenges: FriendChallenge[] = [];

export const adminMetrics = [
  { label: "Daily active users", value: "0", trend: "Live data" },
  { label: "Challenge completion", value: "0%", trend: "Live data" },
  { label: "Premium conversion", value: "0%", trend: "Live data" },
  { label: "Friend invites", value: "0", trend: "Live data" }
];
