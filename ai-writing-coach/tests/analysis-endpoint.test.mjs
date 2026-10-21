import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {stripTypeScriptTypes} from "node:module";
import {test} from "node:test";
import {createContext, SourceTextModule, SyntheticModule} from "node:vm";
import * as review from "../supabase/functions/analyze-text/analysis-review.ts";

const source = stripTypeScriptTypes(await readFile(new URL("../supabase/functions/analyze-text/index.ts", import.meta.url), "utf8"));
const original = "i go there tomorrow";
const superficial = {
  mistakes: [{type: "punctuation", wrong_text: original, correct_text: "I go there tomorrow.", explanation: "Capitalize I and add a period."}],
  explanation: "Capitalize I and add a period.",
};
const repaired = {
  corrected_sentence: "I'm going there tomorrow.",
  mistakes: [
    {type: "word_choice", wrong_text: "i go", correct_text: "I'm going", explanation: "Use a natural future form for a personal plan."},
    {type: "punctuation", wrong_text: "tomorrow", correct_text: "tomorrow.", explanation: "End the sentence with a period."},
  ],
  explanation: "For a personal future plan, use 'I'm going'; present simple can describe fixed schedules.",
};
const approval = (text) => ({verdict: "approve", corrected_sentence: text});
const revision = {verdict: "revise", analysis: repaired};

async function loadEndpoint(responses = []) {
  const prompts = [];
  let handler;
  const context = createContext({
    Request, Response, ReadableStream, TextEncoder,
    console: {log() {}, info() {}, warn() {}, error() {}},
    Deno: {serve: (callback) => {handler = callback;}},
  });
  const ai = new SyntheticModule(["generate"], function () {
    this.setExport("generate", async ({prompt}) => {
      prompts.push(prompt);
      const next = responses.shift();
      if (next instanceof Error) throw next;
      if (next === undefined) throw new Error("Unexpected extra AI call");
      return typeof next === "string" ? next : JSON.stringify(next);
    });
  }, {context});
  const quality = new SyntheticModule(Object.keys(review), function () {
    for (const [key, value] of Object.entries(review)) this.setExport(key, value);
  }, {context});
  const endpoint = new SourceTextModule(source + "\nexport {normaliseResponse, buildPrompt};", {context});
  await endpoint.link((specifier) => {
    if (specifier === "../_shared/ai/index.ts") return ai;
    if (specifier === "./analysis-review.ts") return quality;
    throw new Error(`Unexpected import ${specifier}`);
  });
  await endpoint.evaluate();
  return {handler, prompts, normalise: endpoint.namespace.normaliseResponse, buildPrompt: endpoint.namespace.buildPrompt};
}

function request(text = original, stream = false) {
  return new Request("https://test.example/functions/v1/analyze-text", {
    method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({text, stream}),
  });
}

test("repairs the reported superficial correction and reviews the repair before returning it", async () => {
  const endpoint = await loadEndpoint([superficial, revision, approval(repaired.corrected_sentence)]);
  const response = await endpoint.handler(request());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.corrected_sentence, repaired.corrected_sentence);
  assert.equal(body.mistakes.length, 2);
  assert.equal(body.focusArea, "Word Choice");
  assert.ok(body.accuracyScore < 94);
  assert.match(body.explanation, /fixed schedules/);
  assert.equal(endpoint.prompts.length, 3);
  const reviewData = JSON.parse(endpoint.prompts[1].split("Data:\n")[1]);
  assert.equal(reviewData.original_text, original);
  assert.equal("accuracyScore" in reviewData.proposed_analysis, false);
});

for (const text of [
  "The train leaves tomorrow at six.",
  "According to the itinerary, I go there tomorrow.",
  "I'll call you when I arrive tomorrow.",
  "She goes to work every day.",
]) {
  test(`preserves an approved valid sentence: ${text}`, async () => {
    const endpoint = await loadEndpoint([{mistakes: [], explanation: "This sentence is correct."}, approval(text)]);
    const response = await endpoint.handler(request(text));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.corrected_sentence, text);
    assert.deepEqual(body.mistakes, []);
    assert.equal(body.accuracyScore, 100);
    assert.equal(endpoint.prompts.length, 2);
  });
}

test("generation and review prompts both require contextual future checks without blanket tense changes", async () => {
  const endpoint = await loadEndpoint();
  for (const prompt of [endpoint.buildPrompt(original), review.buildReviewPrompt(original, superficial, null)]) {
    assert.match(prompt, /tomorrow/);
    assert.match(prompt, /personal future plan/);
    assert.match(prompt, /scheduled-future/);
    assert.match(prompt, /time clauses/);
  }
});

test("invalid analyses cannot become a clean 100 or count unapplied edits", async () => {
  const {normalise} = await loadEndpoint();
  for (const raw of [
    {}, [], {explanation: "Looks good"}, {mistakes: [], explanation: ""},
    {...superficial, mistakes: [{...superficial.mistakes[0], wrong_text: "not in the source"}]},
    {...superficial, mistakes: [{...superficial.mistakes[0], correct_text: original}]},
    {...superficial, mistakes: [{...superficial.mistakes[0], type: "invented_type"}]},
    {...superficial, corrected_sentence: repaired.corrected_sentence},
  ]) assert.equal(normalise(raw, original), null);
});

test("overlapping punctuation and grammar edits are rejected instead of dropping the grammar change", async () => {
  const {normalise} = await loadEndpoint();
  assert.equal(normalise({
    ...superficial,
    mistakes: [...superficial.mistakes, {type: "word_choice", wrong_text: "go", correct_text: "am going", explanation: "Use a natural future form."}],
  }, original), null);
});

test("anchors valid punctuation insertions and normalises capitalization labels", async () => {
  const repair = {
    corrected_sentence: "I am going there tomorrow.",
    mistakes: [
      {type: "capitalization", wrong_text: "i", correct_text: "I", start: 0, end: 1, explanation: "Capitalize the pronoun I."},
      {type: "word_choice", wrong_text: "go", correct_text: "am going", start: 2, end: 4, explanation: "Use natural phrasing for a personal future plan."},
      {type: "punctuation", wrong_text: "", correct_text: ".", start: original.length, end: original.length, explanation: "End with a period."},
    ],
    explanation: repaired.explanation,
  };
  const endpoint = await loadEndpoint([superficial, {verdict: "revise", analysis: repair}, approval(repair.corrected_sentence)]);
  const response = await endpoint.handler(request());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.corrected_sentence, repair.corrected_sentence);
  assert.equal(body.mistakes[0].type, "punctuation");
  assert.equal(body.mistakes[2].wrong_text, "tomorrow");
  assert.equal(body.mistakes[2].correct_text, "tomorrow.");
});

test("rejects insertions without a valid explicit source position", async () => {
  const {normalise} = await loadEndpoint();
  for (const position of [undefined, -1, 100, 1.5]) {
    assert.equal(normalise({
      mistakes: [{type: "punctuation", wrong_text: "", correct_text: ".", start: position, end: position, explanation: "Add a period."}],
      explanation: "Add punctuation.",
    }, original), null);
  }
});

test("a future-form repair still receives its missing terminal punctuation before approval", async () => {
  const input = "I am going there tomorrow";
  const corrected = input + ".";
  const endpoint = await loadEndpoint([
    {mistakes: [], explanation: "The future form is natural."},
    {verdict: "revise", analysis: {
      corrected_sentence: corrected,
      mistakes: [{type: "punctuation", wrong_text: "", correct_text: ".", start: input.length, end: input.length, explanation: "End the sentence with a period."}],
      explanation: "The future plan is natural; add its terminal punctuation.",
    }},
    approval(corrected),
  ]);
  const response = await endpoint.handler(request(input));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).corrected_sentence, corrected);
  assert.match(endpoint.prompts[1], /MUST have terminal punctuation/);
});

test("replaces an inaccurate tense explanation even when the corrected wording is already right", async () => {
  const badNote = {...repaired, explanation: "Use future continuous for this future plan."};
  const goodNote = {...repaired, explanation: "Present continuous can express a personal future arrangement."};
  const endpoint = await loadEndpoint([badNote, {verdict: "revise", analysis: goodNote}, approval(goodNote.corrected_sentence)]);
  const response = await endpoint.handler(request());
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.explanation, goodNote.explanation);
  assert.match(endpoint.prompts[1], /PRESENT CONTINUOUS/);
  assert.match(endpoint.prompts[1], /directly for the learner/);
});

test("an invalid initial edit list must be repaired and then reviewed", async () => {
  const endpoint = await loadEndpoint([{...superficial, mistakes: [{...superficial.mistakes[0], wrong_text: "not in the input"}]}, revision, approval(repaired.corrected_sentence)]);
  const response = await endpoint.handler(request());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).corrected_sentence, repaired.corrected_sentence);
  assert.equal(JSON.parse(endpoint.prompts[1].split("Data:\n")[1]).validation_failed, true);
});

test("invalid source edits cannot be approved even if the reviewer says approve", async () => {
  const endpoint = await loadEndpoint([{mistakes: [], explanation: ""}, approval(original)]);
  const response = await endpoint.handler(request());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "ANALYSIS_QUALITY_CHECK_FAILED");
});

for (const response of [
  new Error("review unavailable"), "broken JSON", {verdict: "reject"},
  approval("A different unverified sentence."), {approved: true},
]) {
  test(`withholds unverified results when review returns ${JSON.stringify(response)}`, async () => {
    const endpoint = await loadEndpoint([superficial, response]);
    const result = await endpoint.handler(request());
    const body = await result.json();
    assert.equal(result.status, 503);
    assert.equal(body.code, "ANALYSIS_QUALITY_CHECK_FAILED");
    assert.equal("accuracyScore" in body, false);
    assert.equal("corrected_sentence" in body, false);
  });
}

test("a repair is not accepted until approved, with a bounded three-call limit", async () => {
  const endpoint = await loadEndpoint([superficial, revision, revision]);
  const response = await endpoint.handler(request());
  assert.equal(response.status, 503);
  assert.equal(endpoint.prompts.length, 3);
});

test("streaming returns the same reviewed result and includes a reviewing progress message", async () => {
  const endpoint = await loadEndpoint([superficial, revision, approval(repaired.corrected_sentence)]);
  const response = await endpoint.handler(request(original, true));
  const events = (await response.text()).trim().split("\n\n").map((line) => JSON.parse(line.slice(6)));
  assert.ok(events.some((event) => event.type === "progress" && event.stage === "reviewing"));
  const complete = events.filter((event) => event.type === "complete");
  assert.equal(complete.length, 1);
  assert.equal(complete[0].result.corrected_sentence, repaired.corrected_sentence);
});

test("streaming emits an explicit quality error and no completed analysis on review failure", async () => {
  const endpoint = await loadEndpoint([superficial, new Error("offline")]);
  const response = await endpoint.handler(request(original, true));
  const events = (await response.text()).trim().split("\n\n").map((line) => JSON.parse(line.slice(6)));
  assert.ok(events.some((event) => event.code === "ANALYSIS_QUALITY_CHECK_FAILED"));
  assert.equal(events.some((event) => event.type === "complete"), false);
});

test("preflight and empty-input validation do not call AI", async () => {
  const endpoint = await loadEndpoint();
  assert.equal((await endpoint.handler(new Request("https://test.example", {method: "OPTIONS"}))).status, 200);
  assert.equal((await endpoint.handler(request(""))).status, 400);
  assert.equal(endpoint.prompts.length, 0);
});
