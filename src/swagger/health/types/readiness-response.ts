import { ApiProperty } from '@nestjs/swagger';

class ReadinessChecks {
  @ApiProperty({
    example: true,
    description: 'Database connection status',
  })
  database: boolean;
}

export class ReadinessResponseArgs {
  @ApiProperty({
    example: 'ready',
    description: 'Readiness status',
    enum: ['ready', 'not ready'],
  })
  status: string;

  @ApiProperty({
    example: '2026-05-26T07:12:41.756Z',
    description: 'Current timestamp',
  })
  timestamp: string;

  @ApiProperty({
    type: ReadinessChecks,
    description: 'Individual service checks',
  })
  checks: ReadinessChecks;
}
