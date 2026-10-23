// Fixed list of well-known DBT (Dialectical Behavior Therapy) skills.
// The AI may only pick from this list; it never invents exercises.
// Before a public launch, have a mental health professional review this list.

export type Skill = { key: string; name: string; goodFor: string; steps: string[] };

export const SKILLS: Skill[] = [
  {
    key: "paced-breathing",
    name: "Paced breathing",
    goodFor: "anxiety, stress, racing thoughts, feeling tense",
    steps: [
      "Sit comfortably and rest your hands in your lap.",
      "Breathe in through your nose for a count of 4.",
      "Breathe out slowly through your mouth for a count of 6 to 8.",
      "Keep going for 2 to 3 minutes. Let the out-breath be longer than the in-breath.",
    ],
  },
  {
    key: "tipp",
    name: "TIPP: cool down fast",
    goodFor: "very intense emotion, panic, anger, feeling overwhelmed (scores 1 to 3)",
    steps: [
      "Temperature: hold something cold (cold water on your face, an ice pack) for 30 seconds.",
      "Intense movement: do 1 to 2 minutes of fast movement, like jumping jacks or a brisk walk.",
      "Paced breathing: breathe out longer than you breathe in for 1 minute.",
      "Paired muscle relaxation: tense a muscle group as you breathe in, relax it as you breathe out.",
    ],
  },
  {
    key: "grounding-54321",
    name: "5-4-3-2-1 grounding",
    goodFor: "anxiety, dissociation, feeling spaced out or stuck in your head",
    steps: [
      "Name 5 things you can see.",
      "Name 4 things you can feel or touch.",
      "Name 3 things you can hear.",
      "Name 2 things you can smell.",
      "Name 1 thing you can taste.",
    ],
  },
  {
    key: "self-soothe",
    name: "Self-soothe with the 5 senses",
    goodFor: "sadness, loneliness, feeling drained or hurt",
    steps: [
      "Pick one kind thing for each sense: something to look at, listen to, smell, taste, and touch.",
      "Give it your full attention for a minute or two, without judging it.",
      "Notice any small change in how your body feels.",
    ],
  },
  {
    key: "opposite-action",
    name: "Opposite action",
    goodFor: "an urge that doesn't fit the facts: avoiding things, withdrawing, lashing out",
    steps: [
      "Name the emotion and the urge it brings (for example: sad, urge to stay in bed).",
      "Ask: does this emotion fit the facts, and does acting on it help me?",
      "If not, choose the opposite action (for example: get up and take a short walk).",
      "Do it fully: posture, face, and voice included.",
    ],
  },
  {
    key: "check-the-facts",
    name: "Check the facts",
    goodFor: "worry, assumptions, feeling judged, catastrophizing",
    steps: [
      "Describe what happened, only the facts a camera would record.",
      "Write down what you are telling yourself about it.",
      "Ask: what else could explain this? What is the most likely outcome?",
      "Ask: does my emotion, and how strong it is, fit the facts?",
    ],
  },
  {
    key: "stop",
    name: "STOP skill",
    goodFor: "anger, feeling reactive, about to do something you might regret",
    steps: [
      "Stop: freeze for a moment. Don't act yet.",
      "Take a step back: take one slow breath.",
      "Observe: notice what is happening inside and around you.",
      "Proceed mindfully: ask what action will make things better, not worse.",
    ],
  },
  {
    key: "radical-acceptance",
    name: "Radical acceptance",
    goodFor: "pain about things you cannot change, grief, unfairness",
    steps: [
      "Name the thing you are fighting against that you cannot change right now.",
      "Say to yourself: 'This is how it is right now.'",
      "Notice where you feel resistance in your body, and soften it with a breath.",
      "Remind yourself: accepting is not approving. It frees energy for what you can change.",
    ],
  },
  {
    key: "please",
    name: "PLEASE: care for your body",
    goodFor: "feeling low, irritable, tired, or run down for days",
    steps: [
      "Treat physical illness: is anything hurting or untreated?",
      "Balanced eating: have you eaten something nourishing today?",
      "Avoid mood-altering substances.",
      "Balanced sleep: plan a regular bedtime tonight.",
      "Exercise: plan 10 minutes of movement today.",
    ],
  },
  {
    key: "build-mastery",
    name: "Build mastery",
    goodFor: "feeling helpless, unmotivated, stuck, low confidence",
    steps: [
      "Pick one small task that is a little challenging but doable today.",
      "Break it into the smallest first step.",
      "Do that first step now, or schedule it.",
      "Notice the sense of accomplishment when it is done.",
    ],
  },
  {
    key: "wise-mind",
    name: "Wise mind",
    goodFor: "confusion, mixed feelings, a hard decision",
    steps: [
      "Breathe in and silently ask: 'What does my wise mind say?'",
      "Breathe out and listen for an answer. Don't force it.",
      "Notice the difference between what your emotions want and what your reasoning says.",
      "Look for the answer that respects both.",
    ],
  },
  {
    key: "pleasant-events",
    name: "Do something pleasant",
    goodFor: "boredom, low mood, feeling flat",
    steps: [
      "Pick one small pleasant thing you can do in the next hour (music, a walk, a call, a favorite drink).",
      "Do it, and keep your attention on it.",
      "If worries come up, notice them and gently return to the activity.",
    ],
  },
];

export const SKILL_KEYS = SKILLS.map((s) => s.key) as [string, ...string[]];

export function getSkill(key: string): Skill {
  return SKILLS.find((s) => s.key === key) ?? SKILLS[0];
}
