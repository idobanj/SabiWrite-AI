import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {stripTypeScriptTypes} from "node:module";
import {test} from "node:test";
import {createContext, SourceTextModule, SyntheticModule} from "node:vm";
import {transformWithOxc} from "vite";

const sessionSource = await readFile(new URL("../src/lib/session.js", import.meta.url), "utf8");
const user = {id: "user-a"};
const session = {access_token: "token-a", user};

async function sessionClient({current = session, verifications = [{data: {user}}], refreshed = {data: {session: {...session, access_token: "refreshed-token"}}}} = {}) {
  const tokens = [];
  let refreshes = 0;
  const context = createContext({});
  const sdk = new SyntheticModule(["supabase"], function () {
    this.setExport("supabase", {auth: {
      getSession: async () => ({data: {session: current}}),
      getUser: async (token) => {tokens.push(token); return verifications.shift();},
      refreshSession: async () => {refreshes++; return refreshed;},
    }});
  }, {context});
  const mod = new SourceTextModule(sessionSource, {context});
  await mod.link(() => sdk);
  await mod.evaluate();
  return {requireSession: mod.namespace.requireSession, tokens, refreshes: () => refreshes};
}

test("a verified session supplies its token and authenticated user for saving", async () => {
  const client = await sessionClient();
  const result = await client.requireSession(user.id);
  assert.equal(result.access_token, session.access_token);
  assert.equal(result.user.id, user.id);
  assert.deepEqual(client.tokens, [session.access_token]);
});

test("a cached UI user with no SDK session cannot send anonymous saves", async () => {
  const client = await sessionClient({current: null});
  await assert.rejects(() => client.requireSession(user.id), (error) => error.code === "AUTH_SESSION_REQUIRED");
  assert.deepEqual(client.tokens, []);
});

test("a rejected token is refreshed and reverified once before saving", async () => {
  const client = await sessionClient({verifications: [{error: {status: 401}}, {data: {user}}]});
  assert.equal((await client.requireSession(user.id)).access_token, "refreshed-token");
  assert.equal(client.refreshes(), 1);
  assert.deepEqual(client.tokens, ["token-a", "refreshed-token"]);
});

test("an unrecoverable session stops instead of falling back to the public key", async () => {
  const client = await sessionClient({verifications: [{error: {status: 401}}], refreshed: {data: {session: null}, error: {status: 400}}});
  await assert.rejects(() => client.requireSession(user.id), /sign in again/);
  assert.equal(client.refreshes(), 1);
});

test("switching accounts cannot attach an old draft to the newly signed-in user", async () => {
  const client = await sessionClient({verifications: [{data: {user: {id: "user-b"}}}]});
  await assert.rejects(() => client.requireSession(user.id), (error) => error.code === "AUTH_ACCOUNT_CHANGED");
});

test("an Auth outage does not refresh or discard an otherwise valid session", async () => {
  const client = await sessionClient({verifications: [{error: {status: 503}}]});
  await assert.rejects(() => client.requireSession(user.id), /Check your connection/);
  assert.equal(client.refreshes(), 0);
});

test("AuthProvider keeps its auth subscription after effect cleanup and setup", async () => {
  const source = await readFile(new URL("../src/hooks/useAuth.jsx", import.meta.url), "utf8");
  const {code} = await transformWithOxc(source, "useAuth.jsx", {jsx: {runtime: "automatic"}});
  const states = [];
  const effects = [];
  const listeners = new Set();
  let index = 0;
  const context = createContext({console, window: {location: {hash: "", search: ""}}});
  const synthetic = (exports) => new SyntheticModule(Object.keys(exports), function () {
    for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
  }, {context});
  const react = synthetic({
    createContext: () => ({Provider: "provider"}), useContext() {},
    useState: (initial) => {const slot = index++; states[slot] = initial; return [initial, (value) => {states[slot] = value;}];},
    useRef: (current) => ({current}), useCallback: (fn) => fn, useMemo: (fn) => fn(),
    useEffect: (effect) => effects.push(effect),
  });
  const sdk = synthetic({supabase: {auth: {
    getSession: async () => ({data: {session}}),
    onAuthStateChange: (listener) => {listeners.add(listener); return {data: {subscription: {unsubscribe: () => listeners.delete(listener)}}};},
  }, from: () => ({select: () => ({eq: () => ({single: async () => ({data: {id: user.id}})})})})}});
  const jsx = synthetic({jsx: (type, props) => ({type, props})});
  const mod = new SourceTextModule(code, {context});
  await mod.link((specifier) => specifier === "react" ? react : specifier === "react/jsx-runtime" ? jsx : sdk);
  await mod.evaluate();
  mod.namespace.AuthProvider({children: null});
  const cleanup = effects[0]();
  cleanup();
  const secondCleanup = effects[0]();
  assert.equal(listeners.size, 1);
  const listener = [...listeners][0];
  listener("SIGNED_IN", session);
  assert.equal(states[0], session);
  listener("SIGNED_OUT", null);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(states[0], null);
  assert.equal(states[1], null);
  secondCleanup();
  assert.equal(listeners.size, 0);
});

const logSource = stripTypeScriptTypes(await readFile(new URL("../supabase/functions/log-mistake/index.ts", import.meta.url), "utf8"));
async function logEndpoint(authStatus) {
  let handler;
  const calls = [];
  const context = createContext({
    Request, Response, console,
    Deno: {env: {get: (name) => name === "SUPABASE_URL" ? "https://test.example" : "fixture-server-key"}, serve: (fn) => {handler = fn;}},
    fetch: async (url) => {
      calls.push(url);
      assert.equal(url, "https://test.example/auth/v1/user");
      return Response.json(authStatus === 200 ? user : {message: "Rejected token"}, {status: authStatus});
    },
  });
  const endpoint = new SourceTextModule(logSource, {context});
  await endpoint.link(() => {throw new Error("Unexpected import");});
  await endpoint.evaluate();
  return {handler, calls};
}

for (const status of [401, 403]) {
  test(`log-mistake reports rejected authentication (${status}) as 401 instead of 500`, async () => {
    const endpoint = await logEndpoint(status);
    const response = await endpoint.handler(new Request("https://test.example/log-mistake", {
      method: "POST", headers: {Authorization: "Bearer expired-token"}, body: JSON.stringify({mistakes: []}),
    }));
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.code, "AUTH_SESSION_REQUIRED");
    assert.match(body.error, /sign in again/);
    assert.equal(endpoint.calls.length, 1);
  });
}

test("log-mistake rejects missing authentication before accessing user data", async () => {
  const endpoint = await logEndpoint(200);
  const response = await endpoint.handler(new Request("https://test.example/log-mistake", {method: "POST", body: "{}"}));
  assert.equal(response.status, 401);
  assert.deepEqual(endpoint.calls, []);
});

test("log-mistake preserves successful authenticated calls", async () => {
  const endpoint = await logEndpoint(200);
  const response = await endpoint.handler(new Request("https://test.example/log-mistake", {
    method: "POST", headers: {Authorization: "Bearer valid-token"}, body: JSON.stringify({mistakes: []}),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).upserted, []);
});
