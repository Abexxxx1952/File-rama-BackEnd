import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function createSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .addCookieAuth('Authentication_accessToken')
    .setTitle('File Rama')
    .setDescription('Storing your files')
    .setVersion('1.0')
    .addTag('File Rama API')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'openapi.json',
  });
}
