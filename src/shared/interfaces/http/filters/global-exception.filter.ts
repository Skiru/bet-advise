/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import {
  DomainError,
  NotFoundDomainError,
  InvalidDomainOperationError,
  InvalidDomainStateError,
  ProviderNotConfiguredError,
} from '../../../domain/domain-error';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestAny = request as any;
    const correlationId = requestAny.correlationId || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred.';
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resBody: any = exception.getResponse();
      message =
        typeof resBody === 'string'
          ? resBody
          : resBody.message || exception.message;
      errorCode =
        typeof resBody === 'object' && resBody.error
          ? resBody.error
          : 'HTTP_EXCEPTION';
      if (typeof resBody === 'object' && resBody.message) {
        details = resBody.message;
      }
    } else if (exception instanceof DomainError) {
      if (exception instanceof NotFoundDomainError) {
        status = HttpStatus.NOT_FOUND;
        errorCode = 'NOT_FOUND';
      } else if (exception instanceof ProviderNotConfiguredError) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        errorCode = 'NO_PRODUCTION_DATA_PROVIDER';
      } else if (
        exception instanceof InvalidDomainOperationError ||
        exception instanceof InvalidDomainStateError
      ) {
        status = HttpStatus.UNPROCESSABLE_ENTITY;
        errorCode = 'UNPROCESSABLE_ENTITY';
      } else {
        status = HttpStatus.BAD_REQUEST;
        errorCode = 'DOMAIN_ERROR';
      }
      message = exception.message;
    } else if (this.isDatabaseError(exception)) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Database service is temporarily unavailable.';
      errorCode = 'DATABASE_UNAVAILABLE';
    } else if (this.isRedisError(exception)) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Cache service is temporarily unavailable.';
      errorCode = 'CACHE_UNAVAILABLE';
    } else if (this.isAwsError(exception)) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Cloud dependencies are temporarily unavailable.';
      errorCode = 'CLOUD_DEPENDENCY_UNAVAILABLE';
    }

    const errorMsg =
      exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;

    // Structured JSON log with redacted values and correlation IDs
    this.logger.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        severity: 'ERROR',
        service: 'bet-advise-backend',
        correlationId,
        errorCode,
        message: this.redactSecrets(errorMsg),
        stack: stack ? this.redactSecrets(stack) : undefined,
      }),
    );

    // RFC 9457-compatible problem details
    response.status(status).json({
      type: `https://api.bet-advise.com/errors/${errorCode.toLowerCase()}`,
      title: message,
      status,
      detail: message,
      instance: request.url,
      errorCode,
      correlationId,
      ...(details ? { invalidParams: details } : {}),
    });
  }

  private isDatabaseError(error: any): boolean {
    if (!error) return false;
    const name = error.constructor?.name || '';
    const msg = error.message || '';
    return (
      name.includes('QueryFailedError') ||
      name.includes('TypeORMError') ||
      msg.includes('database') ||
      msg.includes('connection') ||
      msg.includes('Postgres') ||
      msg.includes('protocol')
    );
  }

  private isRedisError(error: any): boolean {
    if (!error) return false;
    const name = error.constructor?.name || '';
    const msg = error.message || '';
    return (
      name.includes('Redis') || msg.includes('Redis') || msg.includes('ioredis')
    );
  }

  private isAwsError(error: any): boolean {
    if (!error) return false;
    const name = error.constructor?.name || '';
    const msg = error.message || '';
    return (
      name.includes('S3ServiceException') ||
      name.includes('SQSServiceException') ||
      msg.includes('S3') ||
      msg.includes('SQS') ||
      msg.includes('AWS')
    );
  }

  private redactSecrets(str: string): string {
    return str
      .replace(/Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
      .replace(/password=\w+/gi, 'password=[REDACTED]')
      .replace(/postgres:\/\/[^@]+@/gi, 'postgres://[REDACTED]@');
  }
}
