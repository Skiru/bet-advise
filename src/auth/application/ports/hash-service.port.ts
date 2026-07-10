export interface HashServicePort {
  sha256(data: string): string;
  generateSalt(): string;
  generateRandomToken(): string;
}

export const HashServicePortToken = Symbol('HashServicePort');
