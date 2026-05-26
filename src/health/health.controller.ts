import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiHealthGet, ApiReadyGet } from '@/swagger/health';
import { HealthService } from './health.service';
import { ReadinessService } from './readiness.service';

@Controller()
@SkipThrottle()
@ApiTags('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly readinessService: ReadinessService,
  ) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiHealthGet()
  async health() {
    return this.healthService.checkHealth();
  }

  @Get('ready')
  @ApiReadyGet()
  async ready() {
    return this.readinessService.checkReadiness();
  }
}
