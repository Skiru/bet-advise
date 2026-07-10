export class RefreshTokenCommand {
  constructor(
    public readonly refreshToken: string,
    public readonly deviceId: string,
    public readonly userAgent: string | null = null,
    public readonly ipAddress: string | null = null,
  ) {}
}
