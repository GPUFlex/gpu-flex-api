import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/infrastructure/prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { NodesModule } from './modules/nodes/nodes.module';
import { TasksModule } from './modules/tasks/tasks.module';

@Module({
  imports: [PrismaModule, UsersModule, NodesModule, TasksModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
