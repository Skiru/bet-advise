export class LogoutCommand {
  constructor(
    public readonly accessToken: string,
    public readonly refreshToken: string | null = null,
    public readonly logoutAll: boolean = true,
  ) {}
}
