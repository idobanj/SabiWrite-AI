import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {test} from "node:test";
import {createContext, SourceTextModule, SyntheticModule} from "node:vm";
import {AVATARS, getAvatar, isAvatarId} from "../src/lib/avatars.js";

test("five stable character choices have a default for new and existing profiles", () => {
  assert.equal(AVATARS.length, 5);
  assert.equal(new Set(AVATARS.map(({id}) => id)).size, 5);
  assert.equal(new Set(AVATARS.map(({name}) => name)).size, 5);
  for (const avatar of AVATARS) assert.equal(getAvatar(avatar.id), avatar);
  for (const value of [null, undefined, -1, 5, "0", "https://example.com/image.png"]) {
    assert.equal(isAvatarId(value), false);
    assert.equal(getAvatar(value), AVATARS[0]);
  }
});

async function avatarClient({userId = "user-a", failure = null} = {}) {
  const calls = [];
  let checkedUserId;
  const context = createContext({});
  const synthetic = (exports) => new SyntheticModule(Object.keys(exports), function () {
    for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
  }, {context});
  const sdk = synthetic({supabase: {from: (table) => {
    calls.push({table});
    const query = {
      upsert: (row, options) => {calls.push({row, options}); return query;},
      select: () => query,
      setHeader: (name, value) => {calls.push({header: name, value}); return query;},
      single: async () => ({data: {id: userId, avatar_id: calls.find((call) => call.row)?.row.avatar_id, full_name: "Existing name", target_goal: "Existing goal"}, error: failure}),
    };
    return query;
  }}});
  const session = synthetic({requireSession: async (expected) => {
    checkedUserId = expected;
    if (expected !== userId) throw new Error("Account changed");
    return {user: {id: userId}, access_token: "verified-token"};
  }});
  const catalog = synthetic({isAvatarId});
  const source = await readFile(new URL("../src/lib/profile.js", import.meta.url), "utf8");
  const mod = new SourceTextModule(source, {context});
  await mod.link((specifier) => specifier === "./session" ? session : specifier === "./avatars" ? catalog : sdk);
  await mod.evaluate();
  return {save: mod.namespace.saveProfileAvatar, calls, checkedUserId: () => checkedUserId};
}

test("an avatar save stores only the selected ID and uses the verified owner's token", async () => {
  const client = await avatarClient();
  const profile = await client.save(3, "user-a");
  assert.equal(profile.avatar_id, 3);
  assert.equal(profile.full_name, "Existing name");
  assert.equal(client.checkedUserId(), "user-a");
  const row = client.calls.find((call) => call.row).row;
  assert.deepEqual(Object.keys(row).sort(), ["avatar_id", "id", "updated_at"]);
  assert.equal(row.avatar_id, 3);
  assert.equal(row.id, "user-a");
  assert.ok(client.calls.some((call) => call.header === "Authorization" && call.value === "Bearer verified-token"));
});

test("invalid IDs and image URLs cannot be written as avatars", async () => {
  const client = await avatarClient();
  for (const value of [-1, 5, 1.5, "2", "data:image/png;base64,test", null]) {
    await assert.rejects(() => client.save(value, "user-a"), /available avatars/);
  }
  assert.equal(client.calls.length, 0);
});

test("an avatar save cannot switch accounts or write without a signed-in owner", async () => {
  const client = await avatarClient();
  await assert.rejects(() => client.save(2, "user-b"), /Account changed/);
  await assert.rejects(() => client.save(2), /sign in/);
  assert.equal(client.calls.length, 0);
});

test("failed saves remain failures so the picker can preserve its selection and retry", async () => {
  const client = await avatarClient({failure: new Error("Connection interrupted")});
  await assert.rejects(() => client.save(2, "user-a"), /Connection interrupted/);
});
