export class UpdateOneSignalSubIdCommand {
  constructor(
    public readonly externalId: string,
    public readonly subscriptionId: string,
  ) {}
}
