import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { REQUEST_BODY_LOGGING_KEY } from '../decorators/setMetadataRequestBodyLogging.decorator';

@Injectable()
export class LoggerHelperInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}
  private parseRequestBody(context: ExecutionContext) {
    const httpContext = context.switchToHttp();

    const request = httpContext.getRequest<Request>();

    const body = request.body;

    if (!body) {
      return;
    }

    if (body === null || typeof body !== 'object') {
      return body;
    }

    const requestBodyDto = this.reflector.getAllAndOverride(
      REQUEST_BODY_LOGGING_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requestBodyDto) {
      return JSON.stringify(body);
    }

    const instance = plainToInstance(requestBodyDto, body);

    return JSON.stringify(instance);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap((data) => {
        const res = context.switchToHttp().getResponse();
        res.locals.requestData = this.parseRequestBody(context);
        res.locals.responseData = data;
      }),
    );
  }
}
