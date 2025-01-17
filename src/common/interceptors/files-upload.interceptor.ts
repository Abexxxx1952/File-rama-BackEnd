import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { EventEmitter, PassThrough, Readable, Stream } from 'stream';

@Injectable()
export class FilesUploadInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();

    if (!request.events) {
      request.events = new EventEmitter();
    }

    if (!request.isMultipart()) {
      throw new Error('Request is not multipart');
    }

    try {
      let fileStream: Readable | null = null;
      let fileName: string | null = null;
      let mimeType: string | null = null;
      let receivedBytes = 0;
      const totalBytes =
        parseInt(request.raw.headers['content-length'], 10) || 0;

      for await (const part of request.parts()) {
        if (part.type === 'file') {
          fileStream = new Readable();
          fileName = part.filename;
          mimeType = part.mimetype;

          request.body = {
            fileName,
            mimeType,
            fileStream,
          };
          break;
        }
        throw new Error('No files found in request');
      }

      async () => {
        for await (const part of request.parts()) {
          if (part.type === 'file' && fileStream) {
            part.file.on('data', (chunk) => {
              receivedBytes += chunk.length;
              fileStream.push(chunk);

              const progress = Math.round((receivedBytes / totalBytes) * 100);
              request.events.emit('upload-progress', progress);
            });

            part.file.on('end', () => {
              fileStream.push(null);

              request.events.emit('upload-progress', 100);
            });

            part.file.on('error', (err) => {
              throw err;
            });
            break;
          }
          throw new Error('No files found in request');
        }
      };

      return next.handle();
    } catch (err) {
      throw err;
    }
  }
}
