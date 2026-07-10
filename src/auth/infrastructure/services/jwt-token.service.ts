/* eslint-disable */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { TokenServicePort } from '../../application/ports/token-service.port';

@Injectable()
export class JwtTokenService implements TokenServicePort {
  private readonly secret: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly accessTokenTtl: string;
  private readonly refreshTokenTtl: string;

  constructor(private readonly configService: ConfigService) {
    const env = this.configService.get<string>('app.nodeEnv') || 'local';
    this.secret = this.configService.get<string>('jwt.secret') || '';
    if (
      !this.secret ||
      (this.secret === 'super-secret' && env === 'production')
    ) {
      throw new Error(
        'Insecure JWT secret configured in production environment.',
      );
    }
    this.issuer = this.configService.get<string>('jwt.issuer') || 'bet-advise';
    this.audience =
      this.configService.get<string>('jwt.audience') || 'mobile-app';
    this.accessTokenTtl =
      this.configService.get<string>('jwt.accessTokenTtl') || '60m';
    this.refreshTokenTtl =
      this.configService.get<string>('jwt.refreshTokenTtl') || '365d';
  }

  generateAccessToken(payload: Record<string, any>): string {
    return jwt.sign(payload, this.secret, {
      issuer: this.issuer,
      audience: this.audience,
      expiresIn: this.accessTokenTtl as any,
    });
  }

  generateRefreshToken(payload: Record<string, any>): string {
    return jwt.sign(payload, this.secret, {
      issuer: this.issuer,
      audience: this.audience,
      expiresIn: this.refreshTokenTtl as any,
    });
  }

  verifyToken(token: string): Record<string, any> {
    return jwt.verify(token, this.secret, {
      issuer: this.issuer,
      audience: this.audience,
      clockTolerance: 60, // 60 seconds clock tolerance (leeway)
    }) as Record<string, any>;
  }
}
