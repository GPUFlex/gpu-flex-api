import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
    Inject,
  } from '@nestjs/common';
  import { PrismaService } from '../infrastructure/prisma/prisma.service';
  import { CreateNodeDto, UpdateNodeDto } from './dto/nodes.dto';
  import { NodeStatus, TaskStatus } from '@prisma/client';
  
  @Injectable()
  export class NodesService {
    constructor() {}
    @Inject()
    private readonly prisma: PrismaService
  
    async create(dto: CreateNodeDto) {
      const ownerExists = await this.prisma.user.count({
        where: { id: dto.ownerId },
      });
      if (!ownerExists) {
        throw new BadRequestException(`Owner ${dto.ownerId} does not exist`);
      }
  
      return this.prisma.node.create({ data: dto });
    }
  
    findAll() {
      return this.prisma.node.findMany({
        include: { owner: true, tasks: { select: { id: true, status: true } } },
      });
    }
  
    async findOne(id: string) {
      const node = await this.prisma.node.findUnique({
        where: { id },
        include: { owner: true, tasks: true },
      });
      if (!node) throw new NotFoundException(`Node ${id} not found`);
      return node;
    }
  
    async update(id: string, dto: UpdateNodeDto) {
      if (dto.ownerId)
        throw new BadRequestException('Changing ownerId is not allowed');
  
      return this.prisma.node.update({
        where: { id },
        data: dto,
      });
    }
  
    async remove(id: string) {
      const runningTasks = await this.prisma.task.count({
        where: { nodeId: id, status: TaskStatus.RUNNING as unknown as any },
      });
  
      if (runningTasks)
        throw new ConflictException(
          `Cannot delete node ${id}; it still has RUNNING tasks`,
        );
  
      try {
        return await this.prisma.node.delete({ where: { id } });
      } catch (err) {
        throw new ConflictException(
          `Node ${id} still has tasks; reassign or delete them first.`,
        );
      }
    }
  }