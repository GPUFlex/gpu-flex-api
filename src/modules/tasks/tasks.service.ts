import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    InternalServerErrorException,
    Inject,
} from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { CreateTaskDto } from './dto/tasks.dto';
import { TaskStatus, NodeStatus, Prisma } from '@prisma/client';
import * as zlib from 'zlib';
import * as FormData from 'form-data';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TasksService {
    constructor() { }

    @Inject()
    private readonly prisma: PrismaService
    @Inject()
    private readonly configService: ConfigService

    async getConsumerTasks(consumerId: string) {
        const consumerTasks = await this.prisma.task.findMany({
            where: { consumerId: consumerId }
        });
        //console.log(consumerTasks);
        return consumerTasks;
    }

    async getTaskModel(id: string) {
        return this.prisma.task.findUnique({
            where: { id },
            select: { id: true, name: true, trainedModel: true },
        });
    }

    async registerTask(
        dto: CreateTaskDto,
        files: {
            dataset?: Express.Multer.File[];
            modelFile?: Express.Multer.File[];
        },
    ) {
        /* Validate consumer */
        const consumer = await this.prisma.user.findUnique({ where: { id: dto.consumerId } });
        if (!consumer) throw new BadRequestException(`Consumer ${dto.consumerId} not found`);

        /* Validate & compress dataset */
        const datasetFile = files.dataset?.[0];
        if (!datasetFile) throw new BadRequestException('Dataset file missing');

        const gzippedDataset = zlib.gzipSync(datasetFile.buffer);
        const estimatedMemMb = Math.ceil(datasetFile.buffer.length / 1024 / 1024 * 1.2);

        /* Pick a node (just for bookkeeping) */
        const node = await this.prisma.node.findFirst({
            where: { status: NodeStatus.ONLINE },
            orderBy: { freeMemoryMb: 'desc' },
        });

        /* Persist Task row */
        const task = await this.prisma.task.create({
            data: {
                name: dto.name,
                consumerId: dto.consumerId,
                datasetInline: gzippedDataset,      // optional – can store in S3 instead
                status: TaskStatus.QUEUED,
                nodeId: node?.id,
                usedNodeMemoryMb: estimatedMemMb,
            },
        });

        // console.log(files);
        // console.log(datasetFile.buffer);

        /* ↓↓↓ Call Python-coordinator  */
        await this.dispatchToCoordinator(task.id, files, datasetFile.buffer);

        return task; // respond immediately – status still QUEUED
    }

    private async dispatchToCoordinator(
        taskId: string,
        files: {
            modelFile?: Express.Multer.File[];
            dataset?: Express.Multer.File[];
        },
        dataset: Buffer,
    ) {
        const form = new FormData();

        // 1. model_def.py
        if (files.modelFile?.[0]) {
            form.append('model_def', files.modelFile[0].buffer, 'model_def.py');
        } else {
            throw new BadRequestException('Model definition file missing');
        }

        // 2. CSV dataset
        form.append('data', dataset, 'housing.csv');

        // 3. callback_url so coordinator can POST the result back
        const backendCallback = this.configService.get<string>('BACKEND_CALLBACK_URL_FOR_COORDINATOR');
        const coordinatorUrl = this.configService.get<string>('COORDINATOR_URL');

        const callback = `${backendCallback}/api/tasks/${taskId}/finished`;
        form.append('callback_url', callback);

        // Dynamically fetch ONLINE workers
        const workers = await this.prisma.node.findMany({
            where: { status: NodeStatus.ONLINE },
            select: { nodeUrl: true },
        });
        const workerUrls = workers.map(w => w.nodeUrl);
        form.append('workers', JSON.stringify(workerUrls));

        console.log(JSON.stringify(workerUrls));

        // 4. Fire-and-forget coordinator call
        axios.post(`${coordinatorUrl}/start_training`, form, {
            headers: form.getHeaders(),
        }).catch(err => {
            console.error('❌ Coordinator call failed:', err.message);
        });
    }

    async handleFinished(taskId: string, file: Express.Multer.File) {
        if (!file || !file.buffer) throw new BadRequestException('No model file provided');

        try {
            //const gzippedModel = zlib.gzipSync(file.buffer);

            await this.prisma.task.update({
                where: { id: taskId },
                data: {
                    status: TaskStatus.COMPLETED,
                    finishedAt: new Date(),
                    trainedModel: file.buffer,
                },
            });

            console.log(`✅ Final model for task ${taskId} stored (${file.buffer.length} bytes)`);

            return { status: 'stored' };
        } catch (err) {
            console.error(`❌ Failed to store final model for task ${taskId}:`, err);
            throw new InternalServerErrorException('Failed to store final model');
        }
    }

    async updateStatus(taskId: string, newStatus: TaskStatus) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');

        const finalStates: TaskStatus[] = [
            TaskStatus.COMPLETED,
            TaskStatus.FAILED,
            TaskStatus.CANCELLED,
        ];

        const wasFinal = finalStates.includes(task.status);
        const willBeFinal = finalStates.includes(newStatus);


        // Block any attempt to move a task out of a final state
        if (wasFinal && task.status !== newStatus) {
            throw new ConflictException(
                `Task ${taskId} is already ${task.status}; cannot change to ${newStatus}`,
            );
        }

        //if final state -> free VRAM
        if (!wasFinal && willBeFinal) {
            await this.restoreNodeMemory(task.nodeId, task.usedNodeMemoryMb);
        }

        const data: Prisma.TaskUpdateInput = { status: newStatus };

        if (newStatus === TaskStatus.RUNNING && !task.startedAt) {
            data.startedAt = new Date();
        }

        if (willBeFinal) {
            data.finishedAt = new Date();
        }

        return this.prisma.task.update({ where: { id: taskId }, data });
    }

    //for admins
    async remove(taskId: string) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');
        if (task.status === TaskStatus.RUNNING)
            throw new ConflictException('Cannot delete RUNNING task, stop first');

        //update node free memory
        await this.restoreNodeMemory(task.nodeId, task.usedNodeMemoryMb);

        return this.prisma.task.delete({ where: { id: taskId } });
    }

    async reassign(taskId: string) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');

        //restore old's node free memory
        await this.restoreNodeMemory(task.nodeId, task.usedNodeMemoryMb);

        // find new node with required memory
        const newNode = await this.prisma.node.findFirst({
            where: {
                status: NodeStatus.ONLINE,
                freeMemoryMb: { gte: task.usedNodeMemoryMb ?? 0 },
                ...(task.nodeId ? { id: { not: task.nodeId } } : {}),
            },
            orderBy: { freeMemoryMb: 'desc' },
        });
        if (!newNode)
            throw new ConflictException('No alternative node with enough resources');

        //decrement new node's free memory and assign node to a task
        return this.prisma.$transaction(async (tx) => {
            await tx.node.update({
                where: { id: newNode.id },
                data: { freeMemoryMb: { decrement: task.usedNodeMemoryMb ?? 0 } },
            });
            return tx.task.update({
                where: { id: taskId },
                data: { nodeId: newNode.id, status: TaskStatus.QUEUED },
            });
        });
    }

    private async restoreNodeMemory(nodeId: string | null, usedNodeMemoryMb: number) {
        if (nodeId) {
            await this.prisma.node.update({
                where: { id: nodeId },
                data: { freeMemoryMb: { increment: usedNodeMemoryMb ?? 0 } },
            });
        }
    }
}