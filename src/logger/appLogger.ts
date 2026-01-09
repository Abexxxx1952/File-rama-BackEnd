import { Injectable } from '@nestjs/common';

@Injectable()
export class AppLogger {
  info(message: string, meta?: Record<string, any>) {
    if (meta !== undefined) {
      console.log(message, meta);
    } else {
      console.log(message);
    }
  }

  warn(message: string, meta?: Record<string, any>) {
    if (meta !== undefined) {
      console.warn(message, meta);
    } else {
      console.warn(message);
    }
  }

  error(message: string, meta?: Record<string, any>) {
    if (meta !== undefined) {
      console.error(message, meta);
    } else {
      console.error(message);
    }
  }
}
