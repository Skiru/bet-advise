export interface Principal {
  id: string;
  tenantId: string;
  scopes: string[];
  email?: string;
  roles?: string[];
}
