/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { TokenServicePort } from '../../application/ports/token-service.port';

@Injectable()
export class JwtTokenService implements TokenServicePort {
  private readonly secret: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly jwksUri: string;
  private readonly tenantClaimName: string;
  private readonly clockSkew: number;
  private readonly algorithms: string[];

  // Cache for JWKS keys
  private jwksKeys: any[] = [];
  private lastFetchTime = 0;
  private readonly cacheDuration: number;

  constructor(private readonly configService: ConfigService) {
    const env =
      this.configService.get<string>('app.nodeEnv') ||
      this.configService.get<string>('NODE_ENV') ||
      'local';
    this.secret = this.configService.get<string>('jwt.secret') || '';
    this.jwksUri = this.configService.get<string>('jwt.jwksUri') || '';

    if (env === 'production') {
      if (!this.jwksUri && (!this.secret || this.secret === 'super-secret')) {
        throw new Error(
          'Insecure or missing JWT/OIDC configuration in production.',
        );
      }
    }

    this.issuer = this.configService.get<string>('jwt.issuer') || 'bet-advise';
    this.audience =
      this.configService.get<string>('jwt.audience') || 'mobile-app';
    this.tenantClaimName =
      this.configService.get<string>('jwt.tenantClaimName') || 'tenant_id';
    this.clockSkew = this.configService.get<number>('jwt.clockSkew') || 60;
    this.algorithms = this.configService.get<string[]>('jwt.algorithms') || [
      'RS256',
      'HS256',
    ];
    this.cacheDuration =
      this.configService.get<number>('jwt.jwksCacheDuration') || 300000;
  }

  generateAccessToken(payload: Record<string, any>): string {
    return jwt.sign(payload, this.secret, {
      issuer: this.issuer,
      audience: this.audience,
      expiresIn: '60m',
      algorithm: 'HS256',
    });
  }

  generateRefreshToken(payload: Record<string, any>): string {
    return jwt.sign(payload, this.secret, {
      issuer: this.issuer,
      audience: this.audience,
      expiresIn: '365d',
      algorithm: 'HS256',
    });
  }

  async verifyToken(token: string): Promise<Record<string, any>> {
    // 1. Decode token to find kid and alg
    const decoded = jwt.decode(token, { complete: true }) as any;
    if (!decoded || !decoded.header) {
      throw new Error('Invalid JWT format');
    }

    const { alg, kid } = decoded.header;
    if (!this.algorithms.includes(alg)) {
      throw new Error(`Algorithm ${alg} is not allowed`);
    }

    let key: string | Buffer;

    if (alg.startsWith('RS')) {
      if (!this.jwksUri) {
        throw new Error(
          'JWKS URI not configured for asymmetric signature validation',
        );
      }
      key = await this.getSigningKey(kid);
    } else {
      key = this.secret;
    }

    return jwt.verify(token, key, {
      issuer: this.issuer,
      audience: this.audience,
      clockTolerance: this.clockSkew,
      algorithms: this.algorithms as jwt.Algorithm[],
    }) as Record<string, any>;
  }

  private async getSigningKey(kid: string): Promise<string> {
    const now = Date.now();
    if (
      this.jwksKeys.length === 0 ||
      now - this.lastFetchTime > this.cacheDuration
    ) {
      await this.fetchJwks();
    }

    const foundKey = this.jwksKeys.find((k) => k.kid === kid);
    if (!foundKey) {
      await this.fetchJwks();
      const retryKey = this.jwksKeys.find((k) => k.kid === kid);
      if (!retryKey) {
        throw new Error(`Signing key with kid ${kid} not found in JWKS`);
      }
      return this.formatPublicKey(retryKey);
    }

    return this.formatPublicKey(foundKey);
  }

  private async fetchJwks(): Promise<void> {
    try {
      const response = await fetch(this.jwksUri);
      if (!response.ok) {
        throw new Error(`HTTP error fetching JWKS: ${response.status}`);
      }
      const data = (await response.json()) as any;
      if (data && Array.isArray(data.keys)) {
        this.jwksKeys = data.keys;
        this.lastFetchTime = Date.now();
      } else {
        throw new Error('Invalid JWKS format returned');
      }
    } catch (err: any) {
      throw new Error(`Failed to fetch OIDC JWKS keys: ${err.message}`);
    }
  }

  private formatPublicKey(key: any): string {
    if (key.x5c && key.x5c[0]) {
      const cert = key.x5c[0].match(/.{1,64}/g).join('\n');
      return `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----`;
    }
    throw new Error('JWKS key has no x5c certificate chain');
  }
}
