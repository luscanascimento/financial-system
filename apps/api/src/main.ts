import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';

import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import type { AppConfiguration } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService<AppConfiguration, true>);
  const { port, globalPrefix, corsOrigin, nodeEnv, isProduction } =
    configService.get('app', { infer: true });

  // Security & performance middleware.
  app.use(helmet());
  app.use(compression());
  app.enableCors({ origin: corsOrigin, credentials: true });

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
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Flush shutdown hooks (Prisma/Redis disconnect) on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  // OpenAPI documentation.
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

  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  const url = `http://localhost:${port}/${globalPrefix}`;
  logger.log(`FinanceHub API running at ${url} (${nodeEnv})`);
  logger.log(`Swagger UI available at ${url}/docs`);
  if (!isProduction) {
    logger.log('Running with development configuration');
  }
}

void bootstrap();
