import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { UsersRepository } from '@/domain/users/repository/users.repository';
import { FilesSystemService } from '../filesSystem/filesSystem.service';
import { StatsRepository } from './repository/stats.repository';
import type { DriveInfoResult } from './types/driveInfoResult';

@Injectable()
export class StatsService {
  constructor(
    @Inject('StatsRepository')
    private readonly statsRepository: StatsRepository,
    @Inject('UsersRepository')
    private readonly usersRepository: UsersRepository,
    private readonly filesSystemService: FilesSystemService,
  ) {}
  async getGoogleDriveInfo(userId: UUID): Promise<DriveInfoResult[]> {
    const result: DriveInfoResult[] = [];
    let totalSize = 0;
    let usedSize = 0;
    try {
      const user = await this.usersRepository.findById(userId);

      for (const account of user.googleServiceAccounts) {
        const { clientEmail, privateKey } = account;

        const driveService = await this.filesSystemService.authenticate({
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        });

        try {
          const about = await driveService.about.get({
            fields: 'storageQuota',
          });

          const storageQuota = about.data.storageQuota;

          const totalSpace = Number(storageQuota.limit);
          const usedSpace = Number(storageQuota.usage);
          const availableSpace = totalSpace - usedSpace;
          console.log(
            'availableSpace',
            availableSpace,
            'totalSpace',
            totalSpace,
            'usedSpace',
            usedSpace,
          );

          totalSize += totalSpace;
          usedSize += usedSpace;

          result.push({
            driveEmail: clientEmail,
            totalSpace,
            usedSpace,
            availableSpace,
          });
        } catch (e) {
          result.push({
            driveEmail: clientEmail,
            error: 'Connection error',
            errorMessage: e.message,
          });
        }
      }

      await this.statsRepository.updateByCondition(
        { userId },
        { totalSize, usedSize, driveInfoResult: result },
      );

      return result;
    } catch (error) {
      throw error;
    }
  }
}
