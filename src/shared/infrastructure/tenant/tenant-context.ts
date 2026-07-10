import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  tenantId: string;
}

@Injectable()
export class TenantContext {
  private static readonly asyncLocalStorage =
    new AsyncLocalStorage<TenantStore>();

  /**
   * Runs a function within the context of a given tenant ID.
   */
  public run<T>(tenantId: string, callback: () => T): T {
    return TenantContext.asyncLocalStorage.run({ tenantId }, callback);
  }

  /**
   * Retrieves the current tenant ID from the active context.
   * Defaults to 'default' if no tenant context is set (e.g., background tasks, system queries).
   */
  public getTenantId(): string {
    const store = TenantContext.asyncLocalStorage.getStore();
    return store?.tenantId || 'default';
  }
}
