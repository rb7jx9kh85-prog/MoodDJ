import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("checkout is invite-only and legacy test code is removed", async () => {
  const [route, discounts] = await Promise.all([
    read("app/api/checkout/complete/route.ts"),
    read("lib/discount-codes.ts"),
  ]);
  assert.match(route, /discount\.percent !== 100/);
  assert.match(route, /Vous n’êtes pas autorisé à utiliser le service/);
  assert.match(discounts, /AMBASSADEUR/);
  assert.match(discounts, /ADMIN/);
  assert.doesNotMatch(discounts, /123456/);
});

test("Spotify tokens are encrypted and bound to a Firebase UID", async () => {
  const cookies = await read("lib/cookies.ts");
  assert.match(cookies, /aes-256-gcm/);
  assert.match(cookies, /OWNER_COOKIE/);
  assert.doesNotMatch(cookies, /\|\| "dev-secret"/);
});

test("private referral profiles cannot be read directly", async () => {
  const rules = await read("firestore.rules");
  const profileBlock = rules.match(/match \/referralProfiles[\s\S]*?\n    }/)?.[0] ?? "";
  assert.match(profileBlock, /allow read, write: if false/);
});

