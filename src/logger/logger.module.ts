import { Global, Module } from '@nestjs/common';
import { AppLogger } from './appLogger';

@Global()
@Module({
  providers: [AppLogger],
  exports: [AppLogger],
})
export class LoggerModule {}
