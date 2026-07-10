export class ApiToken {
  constructor(
    public readonly token: string,
    public readonly externalId: string,
    public readonly preferredBookmaker: string,
    public readonly externalIntegrationId: string,
    public readonly activeBookmaker: string,
    public readonly deviceId: string,
    public readonly expiresAt: Date,
    public oneSignalSubscriptionId: string | null = null,
    public deviceDetails: string | null = null,
  ) {}

  public static create(
    token: string,
    externalId: string,
    preferredBookmaker: string,
    externalIntegrationId: string,
    activeBookmaker: string,
    deviceId: string,
    expiresAt: Date,
    oneSignalSubscriptionId?: string | null,
    deviceDetails?: string | null,
  ): ApiToken {
    return new ApiToken(
      token,
      externalId,
      preferredBookmaker,
      externalIntegrationId,
      activeBookmaker,
      deviceId,
      expiresAt,
      oneSignalSubscriptionId || null,
      deviceDetails || null,
    );
  }

  public isExpired(now: Date = new Date()): boolean {
    return now > this.expiresAt;
  }

  public updateOneSignalSubscriptionId(id: string): void {
    this.oneSignalSubscriptionId = id;
  }
}
