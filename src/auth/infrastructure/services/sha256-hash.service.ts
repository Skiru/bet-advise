import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { HashServicePort } from '../../application/ports/hash-service.port';

@Injectable()
export class Sha256HashService implements HashServicePort {
  sha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  generateSalt(): string {
    return randomBytes(16).toString('hex');
  }

  generateRandomToken(): string {
    return randomBytes(32).toString('hex'); // 64 character hex string
  }
}
