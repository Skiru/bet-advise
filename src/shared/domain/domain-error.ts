export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundDomainError extends DomainError {
  constructor(entityType: string, id: string) {
    super(`${entityType} with ID ${id} was not found.`);
  }
}

export class InvalidDomainOperationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidDomainStateError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
