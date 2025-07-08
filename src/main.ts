import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    // origin: [
    //   'http://localhost:3000',
    //   'http://localhost:6000',
    // ],
    origin: true,
    credentials: true,
  });
  app.setGlobalPrefix('api');
  await app.listen(8000, '0.0.0.0');  // не лише 127.0.0.1
}
bootstrap();
