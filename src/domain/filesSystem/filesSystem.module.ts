import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import {
  FILES_REPOSITORY,
  FOLDERS_REPOSITORY,
} from '@/configs/providersTokens';
import { DatabaseModule } from '../../database/database.module';
import { StatsModule } from '../stats/stats.module';
import { UsersModule } from '../users/users.module';
import { FilesController } from './filesSystem.controller';
import { FilesSystemService } from './filesSystem.service';
import { FilesRepository } from './repository/files.repository';
import { FoldersRepository } from './repository/folders.repository';
import { CommonFileSystemService } from './services/commonFileSystemService/commonFileSystemService';
import { DeleteFileSystemService } from './services/deleteFileSystemService/deleteFileSystemService';
import { FileTransferService } from './services/fileTransferService/fileTransferService';
import { GoogleDriveClient } from './services/googleDriveClient/googleDriveClient';
import { PermissionsService } from './services/permissionsService/permissionsService';
import { StaticFilesService } from './services/staticFilesService/staticFilesService';
import { UpdateFileSystemService } from './services/updateFileSystemService/updateFileSystemService';

@Module({
  imports: [DatabaseModule, ConfigModule, UsersModule, JwtModule, StatsModule],
  controllers: [FilesController],
  providers: [
    FilesSystemService,
    GoogleDriveClient,
    FileTransferService,
    PermissionsService,
    StaticFilesService,
    UpdateFileSystemService,
    DeleteFileSystemService,
    CommonFileSystemService,
    {
      provide: FILES_REPOSITORY,
      useClass: FilesRepository,
    },
    {
      provide: FOLDERS_REPOSITORY,
      useClass: FoldersRepository,
    },
  ],
  exports: [GoogleDriveClient],
})
export class FilesSystemModule {}
