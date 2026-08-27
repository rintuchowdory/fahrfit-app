import { describe, expect, it } from "vitest";
import { isAnswerCorrect, nextMastery } from "../shared/learning";

describe("learning logic", () => {
  it("accepts the same answer set independent of order", () => {
    expect(isAnswerCorrect([3, 1], [1, 3])).toBe(true);
    expect(isAnswerCorrect([1], [1, 3])).toBe(false);
    expect(isAnswerCorrect([2], [1])).toBe(false);
  });

  it("moves incorrect questions into review and graduates after three successes", () => {
    expect(nextMastery(false, 0)).toBe("needs_review");
    expect(nextMastery(true, 1, "needs_review")).toBe("in_training");
    expect(nextMastery(true, 3, "in_training")).toBe("secure");
  });
});
