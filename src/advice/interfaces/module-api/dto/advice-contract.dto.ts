export class AdviceContractDto {
  constructor(
    public readonly id: string,
    public readonly matchId: string,
    public readonly market: string,
    public readonly selection: string,
    public readonly calibratedProbability: number | null,
    public readonly rationale: string,
    public readonly decision: string,
  ) {}
}
