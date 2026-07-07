/* eslint-disable */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const correlationId = request.headers['x-correlation-id'] || randomUUID();
    request['correlationId'] = correlationId;

    if (response && typeof response.setHeader === 'function') {
      response.setHeader('x-correlation-id', correlationId);
    }

    return next.handle();
  }
}
