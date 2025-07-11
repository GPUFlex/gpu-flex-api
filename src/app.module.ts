import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/infrastructure/prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { NodesModule } from './modules/nodes/nodes.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule, 
    UsersModule, 
    NodesModule, 
    TasksModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
