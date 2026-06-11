import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS restricted to the configured web origin (Req 18.2).
  // `credentials: true` is required because cross-origin `navigator.sendBeacon`
  // (used by the analytics page-view beacon) sends the request in credentials
  // mode 'include'; without it the preflight fails. Origin is explicitly pinned
  // (never '*'), so enabling credentials is safe.
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  // Consistent error envelope across the API (Req 3.4, 3.5).
  app.useGlobalFilters(new AllExceptionsFilter());

  // Interactive Swagger docs (Req 17.1, 17.2).
  const config = new DocumentBuilder()
    .setTitle('Portfolio API')
    .setDescription('Public and Admin API for dev-portfolio-3d')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
