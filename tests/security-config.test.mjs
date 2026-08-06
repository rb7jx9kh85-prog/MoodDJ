import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("paid plans are only ever activated by a signature-verified Whop webhook", async () => {
  const [createRoute, webhookRoute, whopClient, checkoutPage] = await Promise.all([
    read("app/api/checkout/create/route.ts"),
    read("app/api/webhooks/whop/route.ts"),
    read("lib/whop.ts"),
    read("app/checkout/page.tsx"),
  ]);

  // The create route must never itself flip a paid plan to active — only the
  // webhook (after Whop confirms payment) may do that.
  assert.doesNotMatch(createRoute, /paymentStatus:\s*"paid"/);
  assert.match(createRoute, /createWhopCheckoutUrl/);

  assert.match(webhookRoute, /verifyWhopWebhookSignature/);
  assert.match(webhookRoute, /payment\.succeeded/);
  assert.match(webhookRoute, /paymentStatus:\s*"paid"/);

  assert.match(whopClient, /crypto\.createHmac\("sha256"/);
  assert.match(whopClient, /timingSafeEqual/);

  // No trace of the old fictitious card terminal should remain.
  assert.doesNotMatch(checkoutPage, /4242/);
  assert.doesNotMatch(checkoutPage, /Terminal fictif/);
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

