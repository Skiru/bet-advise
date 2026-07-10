export class MatchContractDto {
  constructor(
    public readonly id: string,
    public readonly homeTeam: string,
    public readonly awayTeam: string,
    public readonly kickoffAt: Date,
    public readonly status: string,
    public readonly externalId: string | null,
  ) {}
}
