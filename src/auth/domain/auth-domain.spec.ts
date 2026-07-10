import { RefreshToken } from './refresh-token.entity';
import { ApiToken } from './api-token.entity';

describe('Auth Domain Entities', () => {
  describe('RefreshToken', () => {
    it('should correctly determine expiry status', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 1000);
      const futureDate = new Date(now.getTime() + 1000);

      const tokenExpired = RefreshToken.create(
        'token-1',
        'default',
        'ext-123',
        'Bet365',
        'external-integration-123',
        'Bet365',
        'device-123',
        'salt-1',
        'hash-1',
        now,
        pastDate,
      );

      const tokenActive = RefreshToken.create(
        'token-2',
        'default',
        'ext-123',
        'Bet365',
        'external-integration-123',
        'Bet365',
        'device-123',
        'salt-1',
        'hash-1',
        now,
        futureDate,
      );

      expect(tokenExpired.isExpired(now)).toBe(true);
      expect(tokenExpired.isActive(now)).toBe(false);

      expect(tokenActive.isExpired(now)).toBe(false);
      expect(tokenActive.isActive(now)).toBe(true);
    });

    it('should handle revocation status', () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 1000);

      const token = RefreshToken.create(
        'token-1',
        'default',
        'ext-123',
        'Bet365',
        'external-integration-123',
        'Bet365',
        'device-123',
        'salt-1',
        'hash-1',
        now,
        futureDate,
      );

      expect(token.isRevoked()).toBe(false);
      expect(token.isActive(now)).toBe(true);

      token.revoke(now, 'rotated');

      expect(token.isRevoked()).toBe(true);
      expect(token.isActive(now)).toBe(false);
      expect(token.revokedReason).toBe('rotated');
    });

    it('should handle last used tracking', () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 1000);

      const token = RefreshToken.create(
        'token-1',
        'default',
        'ext-123',
        'Bet365',
        'external-integration-123',
        'Bet365',
        'device-123',
        'salt-1',
        'hash-1',
        now,
        futureDate,
      );

      expect(token.lastUsedAt).toEqual(now); // initially same as issuedAt

      const usageTime = new Date(now.getTime() + 500);
      token.use(usageTime);

      expect(token.lastUsedAt).toEqual(usageTime);
    });

    it('should update one signal subscription id', () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 1000);

      const token = RefreshToken.create(
        'token-1',
        'default',
        'ext-123',
        'Bet365',
        'external-integration-123',
        'Bet365',
        'device-123',
        'salt-1',
        'hash-1',
        now,
        futureDate,
      );

      expect(token.oneSignalSubscriptionId).toBeNull();
      token.updateOneSignalSubscriptionId('onesignal-123');
      expect(token.oneSignalSubscriptionId).toBe('onesignal-123');
    });
  });

  describe('ApiToken', () => {
    it('should determine expiry status', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 1000);
      const futureDate = new Date(now.getTime() + 1000);

      const tokenExpired = ApiToken.create(
        'token-1',
        'default',
        'ext-123',
        'Bet365',
        'external-integration-123',
        'Bet365',
        'device-123',
        pastDate,
      );

      const tokenActive = ApiToken.create(
        'token-2',
        'default',
        'ext-123',
        'Bet365',
        'external-integration-123',
        'Bet365',
        'device-123',
        futureDate,
      );

      expect(tokenExpired.isExpired(now)).toBe(true);
      expect(tokenActive.isExpired(now)).toBe(false);
    });

    it('should update one signal sub id', () => {
      const token = ApiToken.create(
        'token-1',
        'default',
        'ext-123',
        'Bet365',
        'external-integration-123',
        'Bet365',
        'device-123',
        new Date(),
      );

      expect(token.oneSignalSubscriptionId).toBeNull();
      token.updateOneSignalSubscriptionId('os-sub-123');
      expect(token.oneSignalSubscriptionId).toBe('os-sub-123');
    });
  });
});
