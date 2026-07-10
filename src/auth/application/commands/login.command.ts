export class LoginCommand {
  constructor(
    public readonly mobile: string,
    public readonly deviceId: string,
    public readonly deviceDetails: string | null,
    public readonly userAgent: string | null,
    public readonly ipAddress: string | null,
  ) {}
}
