import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  tenantId: string;
}

@Injectable()
export class TenantContext {
  private static readonly asyncLocalStorage =
    new AsyncLocalStorage<TenantStore>();

  public run<T>(tenantId: string, callback: () => T): T {
    const sanitized = tenantId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');
    if (!sanitized) {
      throw new Error(
        'Tenant context cannot be resolved with empty or invalid identifier.',
      );
    }
    return TenantContext.asyncLocalStorage.run(
      { tenantId: sanitized },
      callback,
    );
  }

  public getTenantId(): string {
    const store = TenantContext.asyncLocalStorage.getStore();
    if (!store?.tenantId) {
      throw new Error(
        'Tenant isolation breach: no active tenant context was set.',
      );
    }
    return store.tenantId;
  }
}
