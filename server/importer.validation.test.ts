import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const fixturePath = join(process.cwd(), "server", ".invalid-class-b-fixture.json");

afterEach(() => {
  try { unlinkSync(fixturePath); } catch { /* fixture already removed */ }
});

describe("licensed Class B importer", () => {
  it("rejects an export before touching the database when licensing is missing", () => {
    writeFileSync(fixturePath, JSON.stringify({ metadata: { licenseStatus: "unknown" }, topics: [], questions: [] }));
    expect(() => execFileSync("node", ["scripts/import-class-b.mjs", fixturePath], { cwd: process.cwd(), stdio: "pipe" })).toThrow(/licenseStatus/);
  });

  it("rejects malformed catalog records before import", () => {
    writeFileSync(fixturePath, JSON.stringify({ metadata: { licenseStatus: "licensed", licenseSource: "test-license" }, topics: [{ name: "Vorfahrt" }], questions: [] }));
    expect(() => execFileSync("node", ["scripts/import-class-b.mjs", fixturePath], { cwd: process.cwd(), stdio: "pipe" })).toThrow(/sourceId/);
  });
});
