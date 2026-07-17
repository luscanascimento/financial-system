import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';

import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import type { AppConfiguration } from './config/configuration';

async function bootstrap(): Promise<void> {
  // Disable Nest's default body parser so our size-limited parsers below are
  // the only ones registered (avoids double-parsing / an unbounded fallback).
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  const configService = app.get(ConfigService<AppConfiguration, true>);
  const {
    port,
    globalPrefix,
    corsOrigins,
    trustProxy,
    requestTimeoutMs,
    bodyLimit,
    swaggerEnabled,
    nodeEnv,
    isProduction,
  } = configService.get('app', { infer: true });

  // Trust exactly `trustProxy` reverse-proxy hops so `req.ip` / `req.protocol`
  // reflect the real client (correct rate-limit keying and audit logs) without
  // trusting client-supplied `X-Forwarded-For` beyond the proxies we run.
  app.getHttpAdapter().getInstance().set('trust proxy', trustProxy);

  // Security & performance middleware.
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  // Bound request bodies to blunt memory-exhaustion via oversized payloads.
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
  app.enableCors({ origin: corsOrigins, credentials: true });

  app.setGlobalPrefix(globalPrefix);

  // Consistent validation and error handling across every route.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TimeoutInterceptor(requestTimeoutMs),
  );

  // Flush shutdown hooks (Prisma/Redis disconnect) on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  const logger = new Logger('Bootstrap');

  // OpenAPI documentation — never exposed in production unless explicitly opted
  // in via SWAGGER_ENABLED, so the full API surface isn't advertised publicly.
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('FinanceHub API')
      .setDescription('Personal finance management platform — REST API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${globalPrefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port, '0.0.0.0');

  const url = `http://localhost:${port}/${globalPrefix}`;
  logger.log(`FinanceHub API running at ${url} (${nodeEnv})`);
  if (swaggerEnabled) {
    logger.log(`Swagger UI available at ${url}/docs`);
  }
  if (!isProduction) {
    logger.log('Running with development configuration');
  }
}

void bootstrap();
