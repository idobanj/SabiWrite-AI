import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {test} from "node:test";
import {createContext, SourceTextModule, SyntheticModule} from "node:vm";
import {transformWithOxc} from "vite";

const src = new URL("../src/", import.meta.url);
const corrected = {
  corrected_sentence: "Hi there, how are you?",
  mistakes: [{type: "spelling", wrong_text: "aare", correct_text: "are", explanation: "Remove the extra a."}],
  explanation: "Fix the typo and punctuation.", accuracyScore: 80, focusArea: "Spelling",
};
const quiz = {topic: "spelling", topic_label: "Spelling", questions: [{id: "q1"}]};

async function createHarness({pendingQuiz = false, failFirstQuiz = false} = {}) {
  const calls = [];
  const notices = [];
  const logs = [];
  const cleanups = [];
  const stateChanges = [];
  let quizSignal;
  let finishQuiz;
  const sdk = {
    auth: {
      getSession: async () => ({data: {session: {access_token: "fixture-token"}}}),
      getUser: async () => ({data: {user: {id: "fixture-user"}}}),
    },
    functions: {invoke: async (name, options) => {
      calls.push(name);
      if (name === "generate-quiz") {
        quizSignal = options.signal;
        if (failFirstQuiz && calls.filter((call) => call === name).length === 1) return {data: null, error: {message: "Service unavailable"}};
        if (pendingQuiz) return new Promise((resolve) => {finishQuiz = () => resolve({data: quiz, error: null});});
        return {data: quiz, error: null};
      }
      if (name === "log-mistake") return {data: {upserted: []}, error: null};
      throw new Error(`Unexpected function: ${name}`);
    }},
    from: () => {
      const query = {};
      for (const method of ["insert", "select", "eq", "order", "limit"]) query[method] = () => query;
      query.single = async () => ({data: {id: "fixture-log"}, error: null});
      query.maybeSingle = async () => ({data: null, error: null});
      return query;
    },
  };
  const context = createContext({
    Response, TextDecoder, AbortController,
    console: Object.fromEntries(["log", "warn", "error"].map((level) => [level, (...args) => logs.push({level, args})])),
    fetch: async (url) => {
      calls.push(new URL(url).pathname.split("/").pop());
      return new Response(`data: ${JSON.stringify({type: "complete", result: corrected})}\n\n`);
    },
  });
  const synthetic = (exports) => new SyntheticModule(Object.keys(exports), function () {
    for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
  }, {context});
  const element = (type, props) => ({type, props});
  const mocks = new Map([
    ["react", synthetic({
      useState: (initial) => [typeof initial === "function" ? initial() : initial, (value) => stateChanges.push(value)],
      useRef: (current) => ({current}),
      useMemo: (fn) => fn(),
      useEffect: (effect) => {const cleanup = effect(); if (cleanup) cleanups.push(cleanup);},
    })],
    ["react/jsx-runtime", synthetic({jsx: element, jsxs: element, Fragment: "fragment"})],
    ["react-router-dom", synthetic({useLocation: () => ({state: null}), Link: "a"})],
    ["@supabase/supabase-js", synthetic({createClient: () => sdk})],
  ]);
  const localMocks = new Map([
    ["hooks/useAuth", {useAuth: () => ({session: {user: {id: "fixture-user"}}})}],
    ["components/Toast", {useToast: () => ({show: (message) => notices.push(message)})}],
    ["lib/pendingDraft", {readPendingDraft: () => "hi there how aare you", clearPendingDraft() {}}],
    ["lib/history", {getHistoryEntry: async () => null}],
    ["lib/stats", {getUserStats: async () => ({top_mistake_types: []})}],
  ]);
  for (const name of ["Card", "Button", "Pill", "IconBadge", "Skeleton"]) localMocks.set(`components/${name}`, {[name]: name});
  const pageSources = await Promise.all(["WritingDesk", "PracticeModule"].map((name) => readFile(new URL(`pages/${name}.jsx`, src), "utf8")));
  const icons = new Set(pageSources.flatMap((source) => [...source.matchAll(/import\s*\{([^}]+)\}\s*from\s*"lucide-react"/g)]
    .flatMap((match) => match[1].split(",").map((name) => name.trim()).filter(Boolean))));
  mocks.set("lucide-react", synthetic(Object.fromEntries([...icons].map((name) => [name, name]))));
  const modules = new Map();
  async function load(url) {
    if (modules.has(url.href)) return modules.get(url.href);
    let code = await readFile(url, "utf8");
    if (url.pathname.endsWith(".jsx")) code = (await transformWithOxc(code, url.pathname, {jsx: {runtime: "automatic"}})).code;
    const mod = new SourceTextModule(code, {
      context, identifier: url.href,
      initializeImportMeta: (meta) => {meta.env = {VITE_SUPABASE_URL: "https://test.example", VITE_SUPABASE_ANON_KEY: "fixture-public-key"};},
    });
    modules.set(url.href, mod);
    await mod.link(async (specifier) => {
      if (mocks.has(specifier)) return mocks.get(specifier);
      const resolved = new URL(specifier, url);
      const relative = resolved.href.slice(src.href.length);
      if (localMocks.has(relative)) {
        const mock = synthetic(localMocks.get(relative));
        localMocks.delete(relative);
        mocks.set(resolved.href, mock);
        return mock;
      }
      if (mocks.has(resolved.href)) return mocks.get(resolved.href);
      resolved.pathname += ".js";
      return load(resolved);
    });
    return mod;
  }
  async function page(name) {
    const mod = await load(new URL(`pages/${name}.jsx`, src));
    await mod.evaluate();
    return mod.namespace[name];
  }
  return {
    page, calls, notices, logs, stateChanges,
    unmount: () => cleanups.forEach((cleanup) => cleanup()),
    quizSignal: () => quizSignal,
    finishQuiz: () => finishQuiz(),
  };
}

function findElement(node, type) {
  if (!node || typeof node !== "object") return null;
  if (node.type === type) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const found = findElement(child, type);
    if (found) return found;
  }
  return null;
}

async function mountPractice(harness) {
  const Practice = await harness.page("PracticeModule");
  const flow = Practice().props.children;
  const landing = flow.type(flow.props);
  landing.type(landing.props);
  return landing.props.onStart;
}

test("Check it analyzes and saves writing without generating a quiz", async () => {
  const harness = await createHarness();
  await harness.page("PracticeModule");
  const WritingDesk = await harness.page("WritingDesk");
  const form = findElement(WritingDesk(), "form");
  await form.props.onSubmit({preventDefault() {}});
  assert.deepEqual(harness.calls, ["analyze-text", "log-mistake"]);
  assert.deepEqual(harness.notices, ["Progress saved."]);
});

test("Practice generates a quiz only after an explicit start", async () => {
  const harness = await createHarness();
  const start = await mountPractice(harness);
  await Promise.resolve();
  assert.deepEqual(harness.calls, []);
  await start("spelling", "Spelling", 1);
  assert.deepEqual(harness.calls, ["generate-quiz"]);
  assert.equal(harness.quizSignal().aborted, false);
  assert.deepEqual(harness.logs, []);
});

test("leaving Practice aborts a pending quiz and ignores a late response", async () => {
  const harness = await createHarness({pendingQuiz: true});
  const start = await mountPractice(harness);
  const pending = start("spelling", "Spelling", 1);
  await start("spelling", "Spelling", 1);
  assert.deepEqual(harness.calls, ["generate-quiz"]);
  harness.unmount();
  assert.equal(harness.quizSignal().aborted, true);
  const stateCount = harness.stateChanges.length;
  harness.finishQuiz();
  await pending;
  assert.equal(harness.stateChanges.length, stateCount);
  assert.deepEqual(harness.notices, []);
  assert.deepEqual(harness.logs, []);
});

test("a failed quiz releases the pending request so the user can retry", async () => {
  const harness = await createHarness({failFirstQuiz: true});
  const start = await mountPractice(harness);
  await start("spelling", "Spelling", 1);
  assert.equal(harness.notices.length, 1);
  await start("spelling", "Spelling", 1);
  assert.deepEqual(harness.calls, ["generate-quiz", "generate-quiz"]);
  assert.equal(harness.notices.length, 1);
});
