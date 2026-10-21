import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {stripTypeScriptTypes} from "node:module";
import {test} from "node:test";
import {createContext, SourceTextModule, SyntheticModule} from "node:vm";
import * as quality from "../supabase/functions/generate-quiz/quiz-quality.ts";

const functionSource = stripTypeScriptTypes(await readFile(new URL("../supabase/functions/generate-quiz/index.ts", import.meta.url), "utf8"));
const clientSource = await readFile(new URL("../src/lib/supabase.js", import.meta.url), "utf8");
const quietConsole = {log() {}, info() {}, warn() {}, error() {}};
const examples = [{wrong_text: "She walk.", correct_text: "She walks.", frequency_count: 2, explanation: "Singular subject."}];
const generated = () => JSON.stringify({questions: ["She", "He", "Maya"].map((subject) => ({
  prompt: `${subject} ___ to work every day.`, options: ["walk", "walks", "walking", "have walked"],
  answer_index: 1, explanation: "Unverified author explanation.",
}))});

async function createEndpoint(generate) {
  let handler;
  const context = createContext({
    Request, Response, atob, console: quietConsole,
    Deno: {
      env: {get: (name) => ({SUPABASE_URL: "https://test.example", SUPABASE_SERVICE_ROLE_KEY: "fixture-service-key"})[name]},
      serve: (callback) => {handler = callback;},
    },
    fetch: async (url) => {
      assert.ok(url.startsWith("https://test.example/rest/v1/mistakes?"));
      return Response.json(examples);
    },
  });
  const ai = new SyntheticModule(["generate"], function () {this.setExport("generate", generate);}, {context});
  const checks = new SyntheticModule(Object.keys(quality), function () {
    for (const [name, value] of Object.entries(quality)) this.setExport(name, value);
  }, {context});
  const endpoint = new SourceTextModule(functionSource, {context});
  await endpoint.link((specifier) => {
    if (specifier === "../_shared/ai/index.ts") return ai;
    if (specifier === "./quiz-quality.ts") return checks;
    throw new Error(`Unexpected import: ${specifier}`);
  });
  await endpoint.evaluate();
  return handler;
}

function request() {
  const payload = Buffer.from(JSON.stringify({sub: "fixture-user"})).toString("base64url");
  return new Request("https://test.example/functions/v1/generate-quiz", {
    method: "POST", headers: {Authorization: `Bearer fixture.${payload}.signature`, "Content-Type": "application/json"},
    body: JSON.stringify({topic: "subject_verb_agreement", count: 3}),
  });
}

const reviewData = (prompt) => JSON.parse(prompt.split("Candidate data:\n")[1]);
const review = (prompt, indices = [1]) => JSON.stringify({reviews: reviewData(prompt).map(({id}) => ({
  id, correct_indices: indices,
  explanation: "The singular subject takes 'walks' in the present simple.",
}))});

test("HTTP endpoint returns only a complete quiz with independently reviewed explanations", async () => {
  let calls = 0;
  const handler = await createEndpoint(async ({prompt, temperature}) => {
    calls++;
    if (prompt.includes("Candidate data:\n")) {
      assert.equal(temperature, 0);
      assert.equal(prompt.includes("Unverified author explanation."), false);
      return review(prompt);
    }
    return generated();
  });
  const response = await handler(request());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.questions.length, 3);
  assert.equal(calls, 2);
  assert.ok(body.questions.every((question) => question.explanation.startsWith("The singular subject")));
  assert.deepEqual(body.questions.map(({id}) => id), ["q1", "q2", "q3"]);
});

test("HTTP endpoint withholds the screenshot defect with a retryable quality error", async () => {
  let calls = 0;
  const handler = await createEndpoint(async () => {
    calls++;
    return JSON.stringify({questions: [{
      prompt: "Can you pass me the ___? I need to write it down.",
      options: ["there", "their", "they're", "thier"], answer_index: 1,
      explanation: "Their is possessive.",
    }]});
  });
  const response = await handler(request());
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.code, "QUIZ_QUALITY_CHECK_FAILED");
  assert.equal("questions" in body, false);
  assert.equal(calls, 2);
});

test("HTTP endpoint withholds a quiz when author and reviewer disagree", async () => {
  const handler = await createEndpoint(async ({prompt}) => prompt.includes("Candidate data:\n") ? review(prompt, [0]) : generated());
  const response = await handler(request());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "QUIZ_QUALITY_CHECK_FAILED");
});

test("HTTP endpoint never falls back to author output during a review outage", async () => {
  const handler = await createEndpoint(async ({prompt}) => {
    if (prompt.includes("Candidate data:\n")) throw new Error("Review service unavailable");
    return generated();
  });
  const response = await handler(request());
  assert.equal(response.status, 503);
  assert.equal("questions" in await response.json(), false);
});

test("preflight remains available without generating content", async () => {
  const handler = await createEndpoint(async () => {throw new Error("Must not call AI");});
  assert.equal((await handler(new Request("https://test.example", {method: "OPTIONS"}))).status, 200);
});

async function clientWithError(response) {
  const context = createContext({Response, console: quietConsole});
  const sdk = new SyntheticModule(["createClient"], function () {
    this.setExport("createClient", () => ({functions: {invoke: async () => ({
      data: null, error: {message: "Edge Function returned a non-2xx status code", context: response},
    })}}));
  }, {context});
  const client = new SourceTextModule(clientSource, {
    context,
    initializeImportMeta(meta) {
      meta.env = {VITE_SUPABASE_URL: "https://test.example", VITE_SUPABASE_ANON_KEY: "fixture-anon-key"};
    },
  });
  await client.link(() => sdk);
  await client.evaluate();
  return client.namespace.invokeFunction;
}

test("client displays the quality-check failure as a useful retry message", async () => {
  const invoke = await clientWithError(Response.json({error: "Server message", code: "QUIZ_QUALITY_CHECK_FAILED"}, {status: 503}));
  await assert.rejects(() => invoke("generate-quiz", {}), /couldn't verify enough practice questions/);
});

test("client preserves generic errors and does not expose internal server details", async () => {
  const invoke = await clientWithError(Response.json({error: "Internal server error", detail: "private diagnostic"}, {status: 500}));
  await assert.rejects(() => invoke("generate-quiz", {}), /Function generate-quiz failed: Edge Function returned a non-2xx status code/);
});

test("client still handles non-JSON error responses", async () => {
  const invoke = await clientWithError(new Response("Service unavailable", {status: 503}));
  await assert.rejects(() => invoke("generate-quiz", {}), /Function generate-quiz failed/);
});
