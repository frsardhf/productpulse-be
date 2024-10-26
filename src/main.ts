import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3001', 'https://productpulse-fe.vercel.app'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'node_modules/swagger-ui-dist'), {
    prefix: '/api',
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('ProductPulse')
    .setDescription('This is the API used for the ProductPulse.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'ProductPulse API Documentation',
    customfavIcon: '/api/favicon-32x32.png',
    customJs: [
      '/api/swagger-ui-bundle.js',
      '/api/swagger-ui-standalone-preset.js',
    ],
    customCssUrl: '/api/swagger-ui.css',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
}

bootstrap();