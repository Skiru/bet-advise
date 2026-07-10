import { Member } from './member.entity';

describe('Member Domain Entity', () => {
  it('should correctly instantiate a member using constructor', () => {
    const id = 'member-123';
    const externalId = 'ext-123';
    const preferredBookmaker = 'Bet365';
    const activeBookmaker = 'Bet365';
    const mobile = '+48123456789';
    const isDisabled = false;

    const member = new Member(
      id,
      externalId,
      preferredBookmaker,
      activeBookmaker,
      mobile,
      isDisabled,
    );

    expect(member.id).toBe(id);
    expect(member.externalId).toBe(externalId);
    expect(member.preferredBookmaker).toBe(preferredBookmaker);
    expect(member.activeBookmaker).toBe(activeBookmaker);
    expect(member.mobile).toBe(mobile);
    expect(member.isDisabled).toBe(isDisabled);
  });

  it('should correctly instantiate a member using create factory method', () => {
    const id = 'member-456';
    const externalId = 'ext-456';
    const preferredBookmaker = 'WilliamHill';
    const activeBookmaker = 'WilliamHill';
    const mobile = '+48987654321';
    const isDisabled = true;

    const member = Member.create(
      id,
      externalId,
      preferredBookmaker,
      activeBookmaker,
      mobile,
      isDisabled,
    );

    expect(member.id).toBe(id);
    expect(member.externalId).toBe(externalId);
    expect(member.preferredBookmaker).toBe(preferredBookmaker);
    expect(member.activeBookmaker).toBe(activeBookmaker);
    expect(member.mobile).toBe(mobile);
    expect(member.isDisabled).toBe(isDisabled);
  });
});
