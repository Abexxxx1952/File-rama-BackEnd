import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformResultInterceptor<T> implements NestInterceptor {
  constructor(private readonly entityClass: new () => T) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<T> {
    return next.handle().pipe(
      map((result: { [key: string]: unknown }) => {
        if (this.entityClass) {
          return plainToInstance(this.entityClass, result);
        }
        return result as T;
      }),
    );
  }
}
