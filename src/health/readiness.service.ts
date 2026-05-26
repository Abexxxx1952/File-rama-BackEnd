import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '@/configs/providersTokens';

@Injectable()
export class ReadinessService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async checkReadiness() {
    const checks = {
      database: false,
    };

    try {
      await this.db.execute(sql`SELECT 1`);
      checks.database = true;
    } catch {
      checks.database = false;
    }

    const isReady = Object.values(checks).every((check) => check === true);

    const response = {
      status: isReady ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      checks,
    };

    if (!isReady) {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }
}
