import {
  DomainError,
  InvalidDomainOperationError,
} from '../../shared/domain/domain-error';

export class AuthenticationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class UserNotFoundError extends AuthenticationError {
  constructor(mobile: string) {
    super(`User with mobile number ${mobile} was not found.`);
  }
}

export class InvalidOtpError extends InvalidDomainOperationError {
  constructor() {
    super('The provided OTP is invalid.');
  }
}

export class OtpExpiredError extends InvalidDomainOperationError {
  constructor() {
    super('The OTP has expired. Please request a new one.');
  }
}

export class DeviceBindingError extends InvalidDomainOperationError {
  constructor(
    message = 'Device binding mismatch. Login is restricted to the bound device.',
  ) {
    super(message);
  }
}

export class TokenRevokedError extends AuthenticationError {
  constructor(reason: string) {
    super(`Token was revoked. Reason: ${reason}`);
  }
}

export class TokenExpiredError extends AuthenticationError {
  constructor() {
    super('Token has expired.');
  }
}
