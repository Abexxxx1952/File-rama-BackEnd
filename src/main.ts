import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { getCorsOptions } from './configs/cors.config';
import { getHelmetOptions } from './configs/helmet.config';
import { createSwagger } from './swagger/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const configService = app.get(ConfigService);
  app.enableCors(getCorsOptions(configService));

  app.setGlobalPrefix(configService.getOrThrow<string>('PREFIX_URL') || 'api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.register(fastifyHelmet, getHelmetOptions());

  await app.register(fastifyCookie);
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 1000 * 1024 * 1024, // 1000 MB
    },
  });

  createSwagger(app);

  const PORT = process.env.PORT || 4000;

  try {
    await app.listen(PORT, () => {
      console.log(`Running on Port ${PORT}`);
      console.log(`Running in ${process.env.MODE} mode`);
    });
  } catch (err) {
    console.log(err);
  }

  process.on('SIGINT', async () => {
    await app.close();
    process.exit(0);
  });
}

bootstrap();
