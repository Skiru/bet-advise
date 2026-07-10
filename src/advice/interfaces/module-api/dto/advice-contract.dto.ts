export class AdviceContractDto {
  constructor(
    public readonly id: string,
    public readonly matchId: string,
    public readonly market: string,
    public readonly selection: string,
    public readonly confidence: number,
    public readonly rationale: string,
    public readonly status: string,
  ) {}
}
