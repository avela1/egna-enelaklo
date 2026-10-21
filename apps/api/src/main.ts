import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PinoLogger } from './common/logging/pino-logger';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { requestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { allowedOrigins, env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(PinoLogger));

  app.setGlobalPrefix(env.API_PREFIX);

  app.use(helmet());
  app.enableCors({
    origin: allowedOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const openApiConfig = new DocumentBuilder()
    .setTitle('egna-enelaklo API')
    .setDescription(
      'REST API for the egna-enelaklo task marketplace. All endpoints live under /api/v1.',
    )
    .setVersion('0.1.0')
    .addTag('health', 'Liveness and readiness')
    .build();

  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(env.PORT);

  app.get(PinoLogger).log(`API listening on http://localhost:${env.PORT}/${env.API_PREFIX}`);
  app.get(PinoLogger).log(`Swagger UI on http://localhost:${env.PORT}/api/docs`);
}

void bootstrap();
