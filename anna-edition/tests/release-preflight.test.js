import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inspectListing } from "../release-preflight.mjs";

const app = JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8"));
const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
const privacy = readFileSync(new URL("../PRIVACY.md", import.meta.url), "utf8");

test("Anna Edition listing has valid constraints and privacy disclosures", () => {
  const results = inspectListing(app, manifest, privacy);
  assert.deepEqual(results.errors, []);
});
test("temporary feature-branch store and privacy links remain explicit warnings", () => {
  const { warnings } = inspectListing(app, manifest, privacy);
  assert.equal(warnings.length, 2);
  assert.ok(warnings.some(x => x.includes("privacy_url")));
  assert.ok(warnings.some(x => x.includes("homepage_url")));
});
test("preflight rejects invalid slug, category, tagline and missing privacy notice", () => {
  const changed = { ...app, slug: "-bad-", category: "unlisted", tagline: "z".repeat(161) };
  const { errors } = inspectListing(changed, manifest, "");
  assert.ok(errors.length >= 4);
});
test("preflight rejects non-HTTPS URLs and more than six screenshots", () => {
  const changed = {
    ...app, privacy_url: "http://example.com/privacy",
    screenshots: Array.from({length: 7}, (_, i) => "https://example.org/" + i)
  };
  const { errors } = inspectListing(changed, manifest, privacy);
  assert.ok(errors.some(x => x.includes("HTTPS")));
  assert.ok(errors.some(x => x.includes("screenshots")));
});
test("preflight distinguishes stable main-branch links from temporary feature links", () => {
  const changed = {
    ...app,
    homepage_url: "https://github.com/yap-gif/life-control-android/tree/main/anna-edition",
    privacy_url: "https://github.com/yap-gif/life-control-android/blob/main/anna-edition/PRIVACY.md"
  };
  const { errors, warnings } = inspectListing(changed, manifest, privacy);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});
