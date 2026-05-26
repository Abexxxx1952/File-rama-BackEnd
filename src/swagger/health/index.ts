import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthResponseArgs } from './types/health-response';
import { ReadinessResponseArgs } from './types/readiness-response';

export function ApiHealthGet(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Health check endpoint for liveness probe' }),
    ApiResponse({
      status: 200,
      description: 'Application is running',
      type: HealthResponseArgs,
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    }),
  );
}

export function ApiReadyGet(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Readiness check endpoint for readiness probe' }),
    ApiResponse({
      status: 200,
      description: 'Application is ready to accept traffic',
      type: ReadinessResponseArgs,
    }),
    ApiResponse({
      status: 503,
      description: 'Service Unavailable - Application is not ready',
      type: ReadinessResponseArgs,
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    }),
  );
}
