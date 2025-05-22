import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { CurrentUser } from '@/common/decorators/currentUser.decorator';
import { ApiStatsGet, ApiStatsGetFromHeaders } from '@/swagger/stats';
import { CacheInterceptor } from '../../common/interceptors/cache.interceptor';
import { AccessTokenAuthGuardFromCookies } from '../users/auth/guards/access-token-from-cookies.guard';
import { AccessTokenAuthGuardFromHeaders } from '../users/auth/guards/access-token-from-headers.guard';
import { StatsRepository } from './repository/stats.repository';
import { StatsService } from './stats.service';
import { Stat } from './types/stat';

@ApiTags('v1/stats')
@Controller('v1/stats')
export class StatsController {
  constructor(
    @Inject('StatsRepository')
    private readonly statsRepository: StatsRepository,
    private readonly statsService: StatsService,
  ) {}

  @Get('userStats')
  @UseGuards(AccessTokenAuthGuardFromCookies)
  @HttpCode(HttpStatus.OK)
  /*   @UseInterceptors(CacheInterceptor) */
  @ApiStatsGet()
  async getStats(@CurrentUser('id') currentUserId: UUID): Promise<Stat> {
    await this.statsService.getGoogleDriveInfo(currentUserId);

    return await this.statsRepository.findOneByCondition({
      userId: currentUserId,
    });
  }

  @Get('userStatsFromHeaders')
  @UseGuards(AccessTokenAuthGuardFromHeaders)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CacheInterceptor)
  @ApiStatsGetFromHeaders()
  async getStatsFromHeaders(
    @CurrentUser('id') currentUserId: UUID,
  ): Promise<Stat> {
    await this.statsService.getGoogleDriveInfo(currentUserId);

    return await this.statsRepository.findOneByCondition({
      userId: currentUserId,
    });
  }
}
