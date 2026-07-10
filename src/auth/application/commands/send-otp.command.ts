export class SendOtpCommand {
  constructor(
    public readonly mobile: string,
    public readonly deviceId: string,
    public readonly userAgent: string | null = null,
    public readonly ipAddress: string | null = null,
  ) {}
}
