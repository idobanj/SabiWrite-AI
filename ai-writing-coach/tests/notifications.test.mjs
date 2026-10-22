import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {stripTypeScriptTypes} from "node:module";
import {test} from "node:test";
import {runInNewContext} from "node:vm";

test("the notification bell reads writing notifications without quiz history or mastery services", async () => {
  const source = await readFile(new URL("../supabase/functions/get-notifications/index.ts", import.meta.url), "utf8");
  const notification = {id: "notice-1", kind: "repeat_milestone", title: "Recurring spelling mistake"};
  const requests = [];
  const warnings = [];
  let handler;
  runInNewContext(stripTypeScriptTypes(source), {
    Response, Date,
    console: {warn: (...args) => warnings.push(args)},
    Deno: {
      env: {get: (key) => key === "SUPABASE_URL" ? "https://fixture.example" : "fixture-key"},
      serve: (callback) => {handler = callback;},
    },
    fetch: async (input, init = {}) => {
      const url = new URL(input);
      requests.push({path: url.pathname, method: init.method ?? "GET"});
      if (url.pathname === "/auth/v1/user") return Response.json({id: "user-1"});
      if (url.pathname === "/rest/v1/notifications") {
        if (url.searchParams.get("kind")) return Response.json([]);
        return Response.json(url.searchParams.get("select") === "id" ? [{id: notification.id}] : [notification]);
      }
      if (url.pathname === "/rest/v1/analysis_logs") {
        return Response.json(url.searchParams.get("select") === "id" ? [{id: "draft-1"}] : [{created_at: new Date().toISOString()}]);
      }
      throw new Error("Unexpected backend dependency: " + url.pathname);
    },
  });
  const response = await handler(new Request("https://fixture.example/functions/v1/get-notifications", {
    method: "POST", headers: {Authorization: "Bearer fixture-token"},
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {notifications: [notification], unread_count: 1});
  assert.deepEqual(warnings, []);
  assert.ok(requests.every(({path, method}) => method === "GET" && ["/auth/v1/user", "/rest/v1/notifications", "/rest/v1/analysis_logs"].includes(path)));
});
