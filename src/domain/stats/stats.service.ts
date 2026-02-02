import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { STATS_REPOSITORY, USERS_REPOSITORY } from '@/configs/providersTokens';
import { UsersRepository } from '@/domain/users/repository/users.repository';
import { GoogleDriveClient } from '../filesSystem/services/googleDriveClient/googleDriveClient';
import { GoogleServiceAccounts } from '../users/types/google-service-accounts';
import { StatsRepository } from './repository/stats.repository';
import type { DriveInfoResult } from './types/driveInfoResult';
import { Stat } from './types/stat';

@Injectable()
export class StatsService {
  constructor(
    @Inject(STATS_REPOSITORY)
    private readonly statsRepository: StatsRepository,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    private readonly googleDriveClient: GoogleDriveClient,
  ) {}
  async getGoogleDriveInfo(userId: UUID): Promise<DriveInfoResult[]> {
    const result: DriveInfoResult[] = [];
    let totalSize = 0;
    let usedSize = 0;
    try {
      const user = await this.usersRepository.findById(userId);

      for (const account of user.googleServiceAccounts) {
        const { clientEmail, privateKey } = account;

        const driveService = await this.googleDriveClient.authenticate({
          clientEmail,
          privateKey,
        });

        try {
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

  async createUserStats(
    id: UUID,
    googleServiceAccounts: GoogleServiceAccounts[],
  ): Promise<Stat> {
    const totalSize = googleServiceAccounts.length * 15 * 1024 * 1024 * 1024; // 15GB per account

    const initialUserStats = {
      userId: id,
      fileCount: 0,
      folderCount: 0,
      totalSize,
      usedSize: 0,
    };

    const result = await this.statsRepository.create(initialUserStats);

    return result;
  }

  async updateUserStats(
    id: UUID,
    googleServiceAccounts: GoogleServiceAccounts[],
  ): Promise<Stat> {
    const totalSize = googleServiceAccounts.length * 15 * 1024 * 1024 * 1024; // 15GB per account

    const result = await this.statsRepository.updateByCondition(
      { userId: id },
      { totalSize },
    );

    return result[0];
  }
}
