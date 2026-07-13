/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  TransactionStartEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';
import { TenantContext } from './tenant-context';
import { Injectable, Optional } from '@nestjs/common';

@EventSubscriber()
@Injectable()
export class TenantRlsSubscriber implements EntitySubscriberInterface {
  constructor(
    @Optional()
    private readonly tenantContext?: TenantContext,
  ) {}

  private getContext(): TenantContext | null {
    return this.tenantContext || null;
  }

  /**
   * Automatically sets transaction-local tenant context in PostgreSQL.
   */
  async afterTransactionStart(event: TransactionStartEvent): Promise<void> {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const tenantId = ctx.getTenantId();
      if (tenantId && tenantId !== 'public') {
        const sanitized = tenantId.replace(/[^a-z0-9_-]/g, '');
        await event.queryRunner.query(
          `SET LOCAL app.current_tenant_id = '${sanitized}'`,
        );
      }
    } catch {
      // Ignore if no context or database is executing outside of request thread
    }
  }

  /**
   * Enforces and injects tenantId on entity insertions.
   */
  beforeInsert(event: InsertEvent<any>): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const tenantId = ctx.getTenantId();
      if (tenantId && tenantId !== 'public') {
        if ('tenantId' in event.entity) {
          event.entity.tenantId = tenantId;
        } else if ('tenant_id' in event.entity) {
          event.entity.tenant_id = tenantId;
        }
      }
    } catch {
      // Ignore if executing outside active request context
    }
  }

  /**
   * Validates tenantId during entity updates to prevent cross-tenant writes.
   */
  beforeUpdate(event: UpdateEvent<any>): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const tenantId = ctx.getTenantId();
      if (tenantId && tenantId !== 'public') {
        const entityTenantId =
          event.entity?.tenantId || event.databaseEntity?.tenantId;
        if (entityTenantId && entityTenantId !== tenantId) {
          throw new Error(
            `Tenant mismatch: update denied on foreign resource.`,
          );
        }
      }
    } catch (err: any) {
      if (err.message?.includes('Tenant mismatch')) {
        throw err;
      }
    }
  }

  /**
   * Validates tenantId during entity deletion to prevent cross-tenant deletes.
   */
  beforeRemove(event: RemoveEvent<any>): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const tenantId = ctx.getTenantId();
      if (tenantId && tenantId !== 'public') {
        const entityTenantId =
          event.entity?.tenantId || event.databaseEntity?.tenantId;
        if (entityTenantId && entityTenantId !== tenantId) {
          throw new Error(
            `Tenant mismatch: remove denied on foreign resource.`,
          );
        }
      }
    } catch (err: any) {
      if (err.message?.includes('Tenant mismatch')) {
        throw err;
      }
    }
  }
}
