export class Provider {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly capabilities: string[],
    public readonly healthState: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY',
    public readonly rateLimitState: {
      maxRequestsPerMin: number;
      currentRequests: number;
    },
    public readonly credentialReference: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  public static create(
    id: string,
    tenantId: string,
    name: string,
    capabilities: string[],
    healthState: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY',
    rateLimitState: { maxRequestsPerMin: number; currentRequests: number },
    credentialReference: string,
  ): Provider {
    return new Provider(
      id,
      tenantId,
      name,
      capabilities,
      healthState,
      rateLimitState,
      credentialReference,
      new Date(),
      new Date(),
    );
  }
}
