/**
 * Read-only local listing preflight. It does NOT call Anna, upload assets,
 * modify app.json or assert the server-side Listing tab is complete.
 *
 * npm run preflight                -> structural errors fail, branch warnings reported
 * npm run preflight -- --release-gate -> structural errors or branch warnings fail
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const CATEGORIES = new Set([
  "productivity", "developer-tools", "creative", "data", "lifestyle",
  "education", "communication", "entertainment", "utilities"
]);

export function inspectListing(app, manifest, privacyText) {
  const errors = [];
  const warnings = [];
  const field = (value) => typeof value === "string" ? value : "";
  const lengthIs = (value, min, max) =>
    typeof value === "string" && value.length >= min && value.length <= max;

  if (!lengthIs(app.slug, 3, 80) ||
      !/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(field(app.slug))) {
    errors.push("Slug violates the Anna 3–80 character lowercase-and-hyphen pattern.");
  }
  if (!lengthIs(app.name, 1, 120)) errors.push("Name must be 1–120 characters.");
  if (!CATEGORIES.has(app.category)) errors.push("Unknown Anna listing category.");
  if (app.tagline != null && !lengthIs(app.tagline, 0, 160)) {
    errors.push("Tagline exceeds 160 characters.");
  }
  if (app.description != null && !lengthIs(app.description, 0, 20000)) {
    errors.push("Description exceeds 20,000 characters.");
  }
  for (const key of ["homepage_url", "support_url", "privacy_url", "logo_url", "cover_url"]) {
    const value = app[key];
    if (value == null || value === "") continue;
    if (!lengthIs(value, 1, 500)) {
      errors.push(key + " must be a URL of at most 500 characters.");
      continue;
    }
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") errors.push(key + " should use HTTPS.");
      if (["homepage_url", "privacy_url"].includes(key) &&
          url.hostname === "github.com" &&
          /\/(?:blob|tree)\/feature\//.test(url.pathname)) {
        warnings.push(key + " still points to a temporary feature branch; use a stable public release or main URL before submission.");
      }
    } catch {
      errors.push(key + " is not a valid URL.");
    }
  }
  if (app.screenshots != null &&
      (!Array.isArray(app.screenshots) ||
       app.screenshots.length > 6 ||
       app.screenshots.some(value => typeof value !== "string" || value.length > 500))) {
    errors.push("screenshots, if present, must contain at most 6 URLs (each ≤500 characters).");
  }
  if (manifest?.schema !== 4) errors.push("Expected Anna UI manifest schema 4.");
  if (typeof privacyText !== "string" ||
      !["storage", "AI", "delete", "platform"].every(word => privacyText.toLowerCase().includes(word.toLowerCase()))) {
    errors.push("Privacy notice is missing or lacks a key disclosure.");
  }

  return { errors, warnings };
}

export function main(args = process.argv.slice(2)) {
  const app = JSON.parse(readFileSync(join(root, "app.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  const privacyText = readFileSync(join(root, "PRIVACY.md"), "utf8");
  const { errors, warnings } = inspectListing(app, manifest, privacyText);

  console.log("Life Control — local listing preflight");
  console.log("Target:", app.slug, "| candidate:", app.version);
  console.log("Note: Anna Console Listing fields and uploaded media must be reviewed separately.");
  for (const msg of errors) console.error("ERROR:", msg);
  for (const msg of warnings) console.warn("WARNING:", msg);
  if (errors.length === 0) console.log("Structural metadata and privacy-file checks: PASS.");
  if (warnings.length > 0) console.log("Stable public links are still a release gate.");
  const strict = args.includes("--release-gate");
  if (errors.length > 0 || (strict && warnings.length > 0)) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
