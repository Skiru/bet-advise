import { Module, Global } from '@nestjs/common';
import { TenantContext } from './tenant-context';
import { TenantRlsSubscriber } from './tenant-rls.subscriber';

@Global()
@Module({
  providers: [TenantContext, TenantRlsSubscriber],
  exports: [TenantContext, TenantRlsSubscriber],
})
export class TenantModule {}
