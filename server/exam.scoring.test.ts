import { describe, expect, it } from "vitest";
import { calculateExamResult, hasPassedOfficialExam } from "../shared/exam";

describe("official class B exam scoring", () => {
  it("passes at exactly 10 penalty points", () => {
    expect(hasPassedOfficialExam(10, 0)).toBe(true);
  });

  it("fails above the 10-point limit", () => {
    expect(hasPassedOfficialExam(11, 0)).toBe(false);
  });

  it("fails after two incorrect 5-point questions", () => {
    const result = calculateExamResult([
      { isCorrect: false, weight: 5 },
      { isCorrect: false, weight: 5 },
      ...Array.from({ length: 28 }, () => ({ isCorrect: true, weight: 2 })),
    ]);
    expect(result.penaltyPoints).toBe(10);
    expect(result.fivePointErrors).toBe(2);
    expect(result.passed).toBe(false);
  });

  it("does not double-count the final correct answer in the result summary", () => {
    const result = calculateExamResult([
      ...Array.from({ length: 29 }, () => ({ isCorrect: true, weight: 2 })),
      { isCorrect: false, weight: 2 },
    ]);
    expect(result.correctAnswers).toBe(29);
    expect(result.wrongAnswers).toBe(1);
    expect(result.penaltyPoints).toBe(2);
  });

  it("normalizes imported values to the official 2-5 range", () => {
    const result = calculateExamResult([{ isCorrect: false, weight: 1 }, { isCorrect: false, weight: 7 }]);
    expect(result.penaltyPoints).toBe(7);
  });
});
