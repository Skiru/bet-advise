import { Injectable } from '@nestjs/common';
import { ExternalIntegrationPointServicePort } from '../../application/ports/external-integration-point-service.port';
import { Member } from '../../domain/member.entity';

@Injectable()
export class MockExternalIntegrationPointService implements ExternalIntegrationPointServicePort {
  private readonly members: Member[] = [
    Member.create(
      'ex-111',
      'ext-111',
      'Bet365',
      'Bet365',
      '+4511223344',
      false,
    ),
    Member.create(
      'ex-222',
      'ext-222',
      'Unibet',
      'Unibet',
      '+4555667788',
      false,
    ),
    Member.create(
      'ex-disabled',
      'ext-disabled',
      'Bet365',
      'Bet365',
      '+4599999999',
      true,
    ),
  ];

  private readonly parentToLinkedAccounts: Record<string, string[]> = {
    'ext-111': ['linked-bettor-111', 'linked-bettor-222'],
    'ext-222': ['linked-bettor-333'],
  };

  findPersonByMobile(mobile: string): Promise<Member | null> {
    const normalized = mobile.replace(/\s+/g, '');
    const found = this.members.find((m) => m.mobile === normalized);
    return Promise.resolve(found || null);
  }

  getLinkedAccounts(parentExternalId: string): Promise<string[]> {
    return Promise.resolve(this.parentToLinkedAccounts[parentExternalId] || []);
  }
}
