export class OddsQuote {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly providerId: string,
    public readonly bookmakerId: string,
    public readonly eventId: string,
    public readonly marketId: string,
    public readonly outcomeId: string,
    public readonly decimalOdds: number,
    public readonly capturedAt: Date,
    public readonly receivedAt: Date,
    public readonly isSuspended: boolean = false,
    public readonly stale: boolean = false,
    public readonly staleReason: string | null = null,
  ) {
    if (decimalOdds <= 1 || !Number.isFinite(decimalOdds)) {
      throw new Error(
        'Decimal odds must be a finite numeric value greater than 1.',
      );
    }
    if (capturedAt > receivedAt) {
      throw new Error(
        'Coherence error: odds capture time cannot be in the future of receive time.',
      );
    }
    if (!eventId || !marketId || !outcomeId) {
      throw new Error(
        'Odds quote must specify valid event, market, and outcome identifiers.',
      );
    }
  }

  public static create(
    id: string,
    tenantId: string,
    providerId: string,
    bookmakerId: string,
    eventId: string,
    marketId: string,
    outcomeId: string,
    decimalOdds: number,
    capturedAt: Date,
    receivedAt: Date,
    isSuspended = false,
    stale = false,
    staleReason: string | null = null,
  ): OddsQuote {
    return new OddsQuote(
      id,
      tenantId,
      providerId,
      bookmakerId,
      eventId,
      marketId,
      outcomeId,
      decimalOdds,
      capturedAt,
      receivedAt,
      isSuspended,
      stale,
      staleReason,
    );
  }
}
