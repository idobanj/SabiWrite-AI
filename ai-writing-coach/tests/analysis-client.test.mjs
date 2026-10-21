import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {test} from "node:test";
import {createContext, SourceTextModule, SyntheticModule} from "node:vm";

const source = await readFile(new URL("../src/lib/analysis.js", import.meta.url), "utf8");
const failure = {type: "error", code: "ANALYSIS_QUALITY_CHECK_FAILED", error: "We couldn't verify a reliable correction."};
const corrected = {corrected_sentence: "I'm going there tomorrow.", mistakes: [], explanation: "A future plan.", accuracyScore: 100, focusArea: "General"};
const sse = (...events) => new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""), {headers: {"Content-Type": "text/event-stream"}});

async function loadClient(response, fallbackResult = {data: corrected, error: null}) {
  let fetches = 0;
  let fallbacks = 0;
  const context = createContext({
    Response, TextDecoder, console: {log() {}, warn() {}, error() {}},
    fetch: async () => {fetches++; return response;},
  });
  const supabase = {
    auth: {getSession: async () => ({data: {session: {access_token: "fixture-user-token"}}})},
    functions: {invoke: async () => {fallbacks++; return fallbackResult;}},
  };
  const sdk = new SyntheticModule(["supabase"], function () {this.setExport("supabase", supabase);}, {context});
  const client = new SourceTextModule(source, {
    context,
    initializeImportMeta(meta) {
      meta.env = {VITE_SUPABASE_URL: "https://test.example", VITE_SUPABASE_ANON_KEY: "fixture-anon"};
    },
  });
  await client.link(() => sdk);
  await client.evaluate();
  return {client: client.namespace, counts: () => ({fetches, fallbacks})};
}

test("surfaces a streamed quality failure without silently retrying or returning a result", async () => {
  const response = sse(failure);
  const {client, counts} = await loadClient(response);
  await assert.rejects(() => client.analyzeTextStream("i go there tomorrow"), (error) => error.code === failure.code);
  assert.deepEqual(counts(), {fetches: 1, fallbacks: 0});
  assert.equal(response.body.locked, false);
});

test("surfaces a JSON quality failure without starting a second analysis", async () => {
  const {client, counts} = await loadClient(Response.json(failure, {status: 503}));
  await assert.rejects(() => client.analyzeTextStream("draft"), (error) => error.code === failure.code);
  assert.equal(counts().fallbacks, 0);
});

test("standard invocation preserves a quality error returned by Supabase", async () => {
  const {client} = await loadClient(null, {
    data: null,
    error: {message: "HTTP error", context: Response.json(failure, {status: 503})},
  });
  await assert.rejects(() => client.analyzeText("draft"), (error) => error.code === failure.code);
});

test("a generic stream error falls back exactly once", async () => {
  const {client, counts} = await loadClient(sse({type: "error", error: "Connection interrupted"}));
  assert.equal((await client.analyzeTextStream("draft")).corrected_sentence, corrected.corrected_sentence);
  assert.deepEqual(counts(), {fetches: 1, fallbacks: 1});
});

test("an unavailable stream and a failed fallback do not invoke a duplicate fallback", async () => {
  const {client, counts} = await loadClient(new Response("offline", {status: 502}), {data: null, error: {message: "offline"}});
  await assert.rejects(() => client.analyzeTextStream("draft"), /offline/);
  assert.equal(counts().fallbacks, 1);
});

test("an incomplete stream falls back exactly once", async () => {
  const {client, counts} = await loadClient(sse({type: "progress", stage: "reviewing", message: "Reviewing"}));
  await client.analyzeTextStream("draft");
  assert.equal(counts().fallbacks, 1);
});

test("returns a completed reviewed result and passes through review progress", async () => {
  const {client, counts} = await loadClient(sse({type: "progress", stage: "reviewing", message: "Reviewing grammar and meaning"}, {type: "complete", result: corrected}));
  const progress = [];
  const result = await client.analyzeTextStream("draft", (event) => progress.push(event.stage));
  assert.equal(result.corrected_sentence, corrected.corrected_sentence);
  assert.deepEqual(progress, ["reviewing"]);
  assert.equal(counts().fallbacks, 0);
});
