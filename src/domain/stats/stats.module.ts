import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../../database/database.module';
import { FilesSystemModule } from '../filesSystem/filesSystem.module';
import { UsersModule } from '../users/users.module';
import { StatsRepository } from './repository/stats.repository';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    forwardRef(() => UsersModule),
    JwtModule,
    forwardRef(() => FilesSystemModule),
  ],
  controllers: [StatsController],
  providers: [
    StatsService,
    {
      provide: 'StatsRepository',
      useClass: StatsRepository,
    },
  ],
  exports: ['StatsRepository'],
})
export class StatsModule {}
