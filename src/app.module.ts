import { CacheModule } from '@nestjs/cache-manager';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerHelperInterceptor } from './common/interceptors/loggerHelper.interceptor';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { getCacheConfig } from './configs/cache.config';
import { validate } from './configs/env.validate';
import { getThrottlerConfig } from './configs/throttler.config';
import { DatabaseModule } from './database/database.module';
import { DomainModule } from './domain/domain.module';
import { LoggerModule } from './logger/logger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      expandVariables: true,
      validate,
    }),
    LoggerModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getThrottlerConfig(configService),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getCacheConfig(configService),
      isGlobal: true,
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
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
