import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../../database/database.module';
import { StatsModule } from '../stats/stats.module';
import { UsersModule } from '../users/users.module';
import { FilesController } from './filesSystem.controller';
import { FilesSystemService } from './filesSystem.service';
import { FilesRepository } from './repository/files.repository';
import { FoldersRepository } from './repository/folders.repository';

@Module({
  imports: [DatabaseModule, ConfigModule, UsersModule, JwtModule, StatsModule],
  controllers: [FilesController],
  providers: [
    FilesSystemService,
    {
      provide: 'FilesRepository',
      useClass: FilesRepository,
    },
    {
      provide: 'FoldersRepository',
      useClass: FoldersRepository,
    },
  ],
  exports: [FilesSystemService],
})
export class FilesSystemModule {}
