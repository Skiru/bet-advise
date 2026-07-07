export class CreateMatchCommand {
  constructor(
    public readonly homeTeam: string,
    public readonly awayTeam: string,
    public readonly kickoffAt: Date,
    public readonly externalId?: string,
  ) {}
}
