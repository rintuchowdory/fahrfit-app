export type ExamAnswer = { isCorrect: boolean; weight: number };

export function hasPassedOfficialExam(penaltyPoints: number, fivePointErrors: number) {
  return penaltyPoints <= 10 && fivePointErrors < 2;
}

export function buildExamSummary(input: { totalQuestions: number; correctAnswers: number; penaltyPoints: number; fivePointErrors: number }) {
  const correctAnswers = Math.max(0, Math.min(input.totalQuestions, input.correctAnswers));
  return {
    totalQuestions: input.totalQuestions,
    correctAnswers,
    wrongAnswers: Math.max(0, input.totalQuestions - correctAnswers),
    penaltyPoints: input.penaltyPoints,
    fivePointErrors: input.fivePointErrors,
    passed: hasPassedOfficialExam(input.penaltyPoints, input.fivePointErrors),
  };
}

export function calculateExamResult(answers: ExamAnswer[]) {
  const normalized = answers.map(answer => ({ ...answer, weight: Math.min(5, Math.max(2, Math.round(answer.weight))) }));
  const penaltyPoints = normalized.reduce((sum, answer) => sum + (answer.isCorrect ? 0 : answer.weight), 0);
  const fivePointErrors = normalized.filter(answer => !answer.isCorrect && answer.weight === 5).length;
  const correctAnswers = normalized.filter(answer => answer.isCorrect).length;
  return buildExamSummary({ totalQuestions: normalized.length, correctAnswers, penaltyPoints, fivePointErrors });
}
