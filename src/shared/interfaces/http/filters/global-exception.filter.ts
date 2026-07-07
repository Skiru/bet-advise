/* eslint-disable */
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

    // Log the error with correlation ID
    const errorMsg =
      exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(
      `[CorrelationId: ${correlationId}] Caught exception: ${errorCode} - ${errorMsg}`,
      stack,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      errorCode,
      ...(details ? { details } : {}),
      correlationId,
    });
  }

  private isDatabaseError(error: any): boolean {
    if (!error) return false;
    const name = error.constructor?.name || '';
    const msg = error.message || '';
    return (
      name.startsWith('PrismaClient') ||
      msg.includes('Prisma') ||
      msg.includes('database') ||
      msg.includes('connection') ||
      msg.includes('Postgres')
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
}
