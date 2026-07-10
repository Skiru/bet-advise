export class Member {
  constructor(
    public readonly id: string,
    public readonly externalId: string,
    public readonly preferredBookmaker: string,
    public readonly activeBookmaker: string,
    public readonly mobile: string,
    public readonly isDisabled: boolean = false,
  ) {}

  public static create(
    id: string,
    externalId: string,
    preferredBookmaker: string,
    activeBookmaker: string,
    mobile: string,
    isDisabled: boolean = false,
  ): Member {
    return new Member(
      id,
      externalId,
      preferredBookmaker,
      activeBookmaker,
      mobile,
      isDisabled,
    );
  }
}
