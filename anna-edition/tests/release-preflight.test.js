import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inspectListing, inspectReviewScreenshots, inspectScreenshotFreshness } from "../release-preflight.mjs";

const app = JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8"));
const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
const privacy = readFileSync(new URL("../PRIVACY.md", import.meta.url), "utf8");

test("Life Control listing has valid constraints and privacy disclosures", () => {
  const results = inspectListing(app, manifest, privacy);
  assert.deepEqual(results.errors, []);
});
test("pinned public listing links pass the strict local URL checks", () => {
  const { errors, warnings } = inspectListing(app, manifest, privacy);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  assert.match(app.homepage_url, /\/tree\/[a-f0-9]{40}\//);
  assert.match(app.privacy_url, /\/blob\/[a-f0-9]{40}\//);
});

test("temporary feature-branch store and privacy links remain explicit warnings", () => {
  const temporary = {
    ...app,
    homepage_url: "https://github.com/yap-gif/life-control-android/tree/feature/life-control-anna-edition-20261113/anna-edition",
    privacy_url: "https://github.com/yap-gif/life-control-android/blob/feature/life-control-anna-edition-20261113/anna-edition/PRIVACY.md"
  };
  const { warnings } = inspectListing(temporary, manifest, privacy);
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

test("public product name is Life Control across listing, manifest and app UI", () => {
  const index = readFileSync(new URL("../bundle/index.html", import.meta.url), "utf8");
  assert.equal(app.name, "Life Control");
  assert.equal(manifest.ui.views.find(view => view.default)?.title, "Life Control");
  assert.match(index, /<title>Life Control<\/title>/);
  assert.match(index, /class="eyebrow">LIFE CONTROL<\/div>/);
  assert.doesNotMatch(index, /Anna Edition/i);
  assert.doesNotMatch(app.description, /Anna Edition/i);
});

test("review screenshot gate rejects a separate missing-media fixture despite structural pass", () => {
  const withoutScreenshots = { ...app, screenshots: [] };
  assert.deepEqual(inspectListing(withoutScreenshots, manifest, privacy).errors, []);
  const missing = inspectReviewScreenshots(withoutScreenshots);
  assert.ok(missing.some(x => x.includes("three authentic")),
    "Missing screenshots must block local review readiness.");
});

test("current listing metadata includes six immutable v0.1.2 public image URLs", () => {
  assert.equal(app.screenshots.length, 6);
  assert.deepEqual(inspectReviewScreenshots(app), []);
  for (const imageUrl of app.screenshots) {
    const url = new URL(imageUrl);
    assert.equal(url.hostname, "raw.githubusercontent.com");
    assert.match(url.pathname, /^\/yap-gif\/life-control-android\/[0-9a-f]{40}\/anna-edition\/store-screenshots\/v0\.1\.2\/\d\d-v012-[a-z-]+\.webp$/);
  }
});
test("review screenshot gate accepts well-formed public screenshot URLs for manual host verification", () => {
  assert.deepEqual(inspectReviewScreenshots({
    screenshots: ["https://example.org/actual1.png","https://example.org/actual2.png","https://example.org/actual3.png"]
  }), []);
  assert.ok(inspectReviewScreenshots({ screenshots: ["http://example.org/a.png"] }).length > 0);
});

test("review gate accepts new actual multipage v0.1.2 screenshots", () => {
  const sourceVersion = readFileSync(new URL("../store-screenshots/SOURCE-VERSION.txt", import.meta.url), "utf8").trim();
  assert.equal(sourceVersion, "0.1.2");
  assert.equal(app.version, "0.1.2");
  assert.deepEqual(inspectScreenshotFreshness(app.version, sourceVersion), []);
  assert.equal(app.screenshots.length, 6);
});
test("review gate rejects outdated v0.1.1 screenshot fixtures", () => {
  const violations = inspectScreenshotFreshness(app.version, "0.1.1");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /genuine screenshots of the new multi-page UI/);
});
test("fresh authentic v0.1.2 captures can clear the screenshot version gate", () => {
  assert.deepEqual(inspectScreenshotFreshness("0.1.2", "0.1.2"), []);
});
