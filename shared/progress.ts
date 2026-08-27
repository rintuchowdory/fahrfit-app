export function calculateReadinessScore(latestPenaltyPoints: number | undefined) {
  if (latestPenaltyPoints === undefined) return 0;
  return Math.max(0, Math.min(100, Math.round((1 - latestPenaltyPoints / 10) * 100)));
}

export function getReadinessLabel(score: number, simulationCount: number) {
  if (simulationCount === 0) return "Noch keine Simulation";
  if (score >= 80 && simulationCount >= 3) return "Prüfungsbereit";
  if (score >= 60) return "Gut unterwegs";
  return "Weiter trainieren";
}
