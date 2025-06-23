import { CacheModule } from '@nestjs/cache-manager';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerHelperInterceptor } from './common/interceptors/loggerHelper.interceptor';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { validate } from './configs/env.validate';
import { DatabaseModule } from './database/database.module';
import { DomainModule } from './domain/domain.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      expandVariables: true,
      validate,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const mode = configService.getOrThrow('MODE');
        const ttl = configService.getOrThrow('THROTTLER_TTL');
        const limit = configService.getOrThrow('THROTTLER_LIMIT');
        const skipIf = mode === 'production' ? () => false : () => true;
        return [
          {
            ttl,
            limit,
            skipIf,
          },
        ];
      },

      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const ttlProd = configService.getOrThrow('CACHE_TTL');
        const mode = configService.getOrThrow('MODE');
        const ttl = mode === 'production' ? ttlProd : 0;
        return {
          ttl,
        };
      },
      isGlobal: true,
      inject: [ConfigService],
    }),
    DatabaseModule,
    DomainModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerHelperInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
