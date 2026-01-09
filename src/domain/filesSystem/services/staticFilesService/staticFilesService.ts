import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { FILES_REPOSITORY } from '@/configs/providersTokens';
import { AppLogger } from '@/logger/appLogger';
import { FilesRepository } from '../../repository/files.repository';

@Injectable()
export class StaticFilesService {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
    @Inject(FILES_REPOSITORY)
    private readonly filesRepository: FilesRepository,
  ) {}

  async runInitialCleanup() {
    this.logger.info('Running initial static files cleanup');
    const expiredFilesTotalSize = await this.cleanupStaticFiles();
    this.logger.info(`Deleted ${expiredFilesTotalSize} bytes`);
  }

  async dailyCleanup() {
    this.logger.info('Running daily static files cleanup');
    const expiredFilesTotalSize = await this.cleanupStaticFiles();
    this.logger.info(`Deleted ${expiredFilesTotalSize} bytes`);
  }

  private async cleanupStaticFiles(): Promise<number> {
    let expiredFilesTotalSize = 0;
    try {
      const TTL_HOURS = this.configService.getOrThrow<number>(
        'STATIC_FILES_TTL_HOURS',
      );
      const threshold = new Date(Date.now() - TTL_HOURS * 3600 * 1000);

      const expiredFiles =
        await this.filesRepository.findExpiredFiles(threshold);

      const STATIC_DIR = this.configService.getOrThrow<string>(
        'STATIC_FILES_PUBLIC_DIR',
      );

      for (const file of expiredFiles) {
        if (file.fileStaticUrl) {
          expiredFilesTotalSize += file.fileSize;
          try {
            const fileName = file.fileStaticUrl.split('/').pop();
            if (fileName) {
              const filePath = join(process.cwd(), STATIC_DIR, fileName);
              await fs.unlink(filePath);
            }
          } catch (err) {
            this.logger.error(err);
          }
        }

        this.filesRepository.updateById(file.id, {
          fileStaticUrl: null,
          fileStaticCreatedAt: null,
        });
      }
      return expiredFilesTotalSize;
    } catch (err) {
      this.logger.error(err);
    }
  }
}
