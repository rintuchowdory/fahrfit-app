export function isAnswerCorrect(selectedOptionIds: number[], correctOptionIds: number[]) {
  const selected = Array.from(new Set(selectedOptionIds)).sort((a, b) => a - b);
  const correct = Array.from(new Set(correctOptionIds)).sort((a, b) => a - b);
  return selected.length === correct.length && selected.every((id, index) => id === correct[index]);
}

export function nextMastery(isCorrect: boolean, correctCount: number, previousMastery?: string) {
  if (!isCorrect) return "needs_review" as const;
  if (correctCount >= 3) return "secure" as const;
  return previousMastery === "needs_review" ? "in_training" as const : "in_training" as const;
}
