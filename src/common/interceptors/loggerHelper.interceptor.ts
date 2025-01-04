import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { REQUEST_BODY_LOGGING_KEY } from '../decorators/setMetadataRequestBodyLogging.decorator';

@Injectable()
export class LoggerHelperInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  private parseRequestBody(context: ExecutionContext) {
    const httpContext = context.switchToHttp();

    const request = httpContext.getRequest();

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
    const requestBody = this.parseRequestBody(context);

    return next.handle().pipe(
      tap({
        next: (data) => {
          const rep = context.switchToHttp().getResponse();
          rep.raw.locals.requestData = requestBody;
          rep.raw.locals.responseData = data;
        },
        error: (err) => {
          const rep = context.switchToHttp().getResponse();
          rep.raw.locals.requestData = requestBody;
          rep.raw.locals.responseData = err.response || err;
        },
      }),
    );
  }
}
