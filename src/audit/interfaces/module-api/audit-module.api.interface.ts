/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
export interface IAuditModuleApi {
  log(
    action: string,
    entityType: string,
    entityId: string,
    actor?: string | null,
    payload?: Record<string, unknown> | null,
  ): Promise<any>;
}

export const AUDIT_MODULE_API = Symbol('IAuditModuleApi');
