export class RefreshToken {
  constructor(
    public readonly id: string,
    public readonly externalId: string,
    public readonly preferredBookmaker: string,
    public readonly externalIntegrationId: string,
    public readonly activeBookmaker: string,
    public readonly deviceId: string,
    public readonly salt: string,
    public readonly tokenHash: string,
    public readonly issuedAt: Date,
    public readonly expiresAt: Date,
    public deviceDetails: string | null = null,
    public oneSignalSubscriptionId: string | null = null,
    public revokedAt: Date | null = null,
    public revokedReason: string | null = null,
    public lastUsedAt: Date | null = null,
    public userAgent: string | null = null,
    public ipAddress: string | null = null,
  ) {}

  public static create(
    id: string,
    externalId: string,
    preferredBookmaker: string,
    externalIntegrationId: string,
    activeBookmaker: string,
    deviceId: string,
    salt: string,
    tokenHash: string,
    issuedAt: Date,
    expiresAt: Date,
    deviceDetails?: string | null,
    oneSignalSubscriptionId?: string | null,
    userAgent?: string | null,
    ipAddress?: string | null,
  ): RefreshToken {
    return new RefreshToken(
      id,
      externalId,
      preferredBookmaker,
      externalIntegrationId,
      activeBookmaker,
      deviceId,
      salt,
      tokenHash,
      issuedAt,
      expiresAt,
      deviceDetails || null,
      oneSignalSubscriptionId || null,
      null,
      null,
      issuedAt,
      userAgent || null,
      ipAddress || null,
    );
  }

  public isExpired(now: Date = new Date()): boolean {
    return now > this.expiresAt;
  }

  public isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  public isActive(now: Date = new Date()): boolean {
    return !this.isRevoked() && !this.isExpired(now);
  }

  public revoke(now: Date, reason: string): void {
    this.revokedAt = now;
    this.revokedReason = reason;
  }

  public use(now: Date): void {
    this.lastUsedAt = now;
  }

  public updateOneSignalSubscriptionId(id: string): void {
    this.oneSignalSubscriptionId = id;
  }
}
