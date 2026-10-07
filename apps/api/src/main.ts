// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable CORS so the Next.js frontend can make requests to it
  app.enableCors(); 
  await app.listen(3001); 
}
bootstrap();