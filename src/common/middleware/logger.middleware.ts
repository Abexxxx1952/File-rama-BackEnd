import { Injectable, Logger, NestMiddleware } from '@nestjs/common';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP/HTTPS Logger');

  use(req: any, rep: any, next: () => void) {
    rep.locals = {};

    const { method, originalUrl, params, query } = req;
    const start = Date.now();

    rep.on('finish', () => {
      const { statusCode, statusMessage } = rep;
      const responseTime = Date.now() - start;

      const requestLogsBody = `Request ---> 
        Method: ${method}
        URL: ${originalUrl}
        Params: ${JSON.stringify(params)}
        Query: ${JSON.stringify(query)}
        Body: ${JSON.stringify(rep.locals.requestData)}
      `;

      const responseLogsBody = `Response <--- 
        Status Code: ${statusCode}
        Status Message: ${statusMessage}
        Response Time: ${responseTime}ms
        Body: ${JSON.stringify(rep.locals.responseData)}
      `;

      if (statusCode >= 500) {
        this.logger.error(requestLogsBody);
        this.logger.error(responseLogsBody);
        return;
      }

      if (statusCode >= 400) {
        this.logger.warn(requestLogsBody);
        this.logger.warn(responseLogsBody);
        return;
      }

      this.logger.log(requestLogsBody);
      this.logger.log(responseLogsBody);
    });

    next();
  }
}
