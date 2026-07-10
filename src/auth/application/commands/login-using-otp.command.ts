export class LoginUsingOtpCommand {
  constructor(
    public readonly mobile: string,
    public readonly otp: string,
    public readonly deviceId: string,
    public readonly deviceDetails: string | null = null,
    public readonly userAgent: string | null = null,
    public readonly ipAddress: string | null = null,
  ) {}
}
