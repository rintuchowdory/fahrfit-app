import { describe, expect, it } from "vitest";
import { calculateReadinessScore, getReadinessLabel } from "../shared/progress";

describe("exam readiness dashboard", () => {
  it("starts at zero without a simulation", () => {
    expect(calculateReadinessScore(undefined)).toBe(0);
    expect(getReadinessLabel(0, 0)).toBe("Noch keine Simulation");
  });

  it("reaches full readiness from a zero-penalty simulation", () => {
    expect(calculateReadinessScore(0)).toBe(100);
    expect(getReadinessLabel(100, 3)).toBe("Prüfungsbereit");
  });

  it("clamps poor and over-limit results safely", () => {
    expect(calculateReadinessScore(15)).toBe(0);
    expect(calculateReadinessScore(-2)).toBe(100);
    expect(getReadinessLabel(50, 2)).toBe("Weiter trainieren");
  });
});
