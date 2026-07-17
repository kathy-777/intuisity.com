const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

const source = fs.readFileSync("src/data/dailyLessons.ts", "utf8");
const compiled = ts.transpile(source, {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020
});
const moduleShim = { exports: {} };
new Function("require", "module", "exports", compiled)(require, moduleShim, moduleShim.exports);

const { dailyIntuitionLessons } = moduleShim.exports;

assert.equal(dailyIntuitionLessons.length, 600);

const seen = new Set();
for (let dayIndex = 0; dayIndex < 300; dayIndex += 1) {
  const firstIndex = (dayIndex * 2) % dailyIntuitionLessons.length;
  const secondIndex = (firstIndex + 1) % dailyIntuitionLessons.length;
  seen.add(dailyIntuitionLessons[firstIndex].practice);
  seen.add(dailyIntuitionLessons[secondIndex].practice);
}

assert.equal(seen.size, 600);
assert.ok(dailyIntuitionLessons.every((lesson) => lesson.practice.length > 20));
assert.ok(dailyIntuitionLessons.every((lesson) => lesson.reflection.length > 20));

console.log("Daily lesson tests passed");
