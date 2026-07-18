const assert = require("node:assert/strict");
const {
  calculateIntuitionScore,
  scoreDailyChallenge,
  scoreRemoteViewing
} = require("../src/domain/scoringCore");

const challenges = [
  { id: "one", answer: "Star" },
  { id: "two", answer: "Blue" },
  { id: "three", answer: "7" }
];

const daily = scoreDailyChallenge(challenges, {
  one: "Star",
  two: "Green",
  three: "7"
});

assert.deepEqual(daily, {
  correct: 2,
  total: 3,
  percent: 67,
  points: 40
});

const remote = scoreRemoteViewing(
  { imageId: "target", theme: "water", confidence: 5 },
  { imageId: "other", theme: "water" }
);

assert.deepEqual(remote, {
  hit: true,
  points: 50,
  confidenceBonus: 10
});

assert.equal(
  calculateIntuitionScore([
    { percent: 70, weight: 1 },
    { percent: 90, weight: 2 }
  ]),
  83
);

console.log("Scoring tests passed");
