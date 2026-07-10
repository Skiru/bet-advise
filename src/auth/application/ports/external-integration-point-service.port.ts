import { Member } from '../../domain/member.entity';

export interface ExternalIntegrationPointServicePort {
  findPersonByMobile(mobile: string): Promise<Member | null>;
  getLinkedAccounts(parentExternalId: string): Promise<string[]>;
}

export const ExternalIntegrationPointServicePortToken = Symbol(
  'ExternalIntegrationPointServicePort',
);
