import { Inject, Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { drive_v3 } from 'googleapis';
import { UsersRepository } from '@/domain/users/repository/users.repository';
import { FilesSystemService } from '../filesSystem/filesSystem.service';
import { StatsRepository } from './repository/stats.repository';
import { DriveInfoResult } from './types/driveInfoResult';

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
    let driveService: drive_v3.Drive;
    const result: DriveInfoResult[] = [];
    let totalSize: number;
    let usedSize: number;
    const user = await this.usersRepository.findById(userId);

    for (const account of user.googleServiceAccounts) {
      const { clientEmail, privateKey } = account;

      driveService = await this.filesSystemService.authenticate({
        clientEmail,
        privateKey,
      });
      const about = await driveService.about.get({
        fields: 'storageQuota',
      });

      const storageQuota = about.data.storageQuota;

      const totalSpace = Number(storageQuota.limit);
      const usedSpace = Number(storageQuota.usage);
      const availableSpace = totalSpace - usedSpace;
      totalSize += totalSpace;
      usedSize += usedSpace;

      result.push({
        driveEmail: clientEmail,
        totalSpace,
        usedSpace,
        availableSpace,
      });
    }

    await this.statsRepository.updateByCondition(
      { userId },
      { totalSize, usedSize, driveInfoResult: result },
    );

    return result;
  }
}
