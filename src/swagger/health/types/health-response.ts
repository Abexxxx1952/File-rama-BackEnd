import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseArgs {
  @ApiProperty({
    example: 'ok',
    description: 'Health status',
  })
  status: string;

  @ApiProperty({
    example: '2026-05-26T07:12:41.756Z',
    description: 'Current timestamp',
  })
  timestamp: string;

  @ApiProperty({
    example: 123.456,
    description: 'Application uptime in seconds',
  })
  uptime: number;

  @ApiProperty({
    example: 'production',
    description: 'Current environment',
  })
  environment: string;
}
