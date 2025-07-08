import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/tasks.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import * as zlib from 'zlib';


@Controller('tasks')
export class TasksController {
  constructor() { }

  @Inject()
  private readonly tasksService: TasksService

  @Get()
  getConsumerTasks(@Query('consumerId') consumerId: string) {
    return this.tasksService.getConsumerTasks(consumerId);
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'dataset', maxCount: 1 },
      { name: 'modelFile', maxCount: 1 },
    ]),
  )
  registerTask(
    @UploadedFiles() files: {
      dataset?: Express.Multer.File[];
      modelFile?: Express.Multer.File[];
    },
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.registerTask(dto, files);
  }

  @Post(':id/finished')
  @UseInterceptors(FileInterceptor('model'))
  async trainingFinished(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No model received');
    return this.tasksService.handleFinished(id, file);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }

  @Patch(':id/reassign')
  reassign(@Param('id') id: string) {
    return this.tasksService.reassign(id);
  }

  @Get(':id/model')
  async downloadModel(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const task = await this.tasksService.getTaskModel(id);

    if (!task || !task.trainedModel) {
      throw new NotFoundException('No model found for this task');
    }

    // No decompression, return raw .pth model file
    const buffer = task.trainedModel;

    return new StreamableFile(buffer, {
      type: 'application/octet-stream',
      disposition: `attachment; filename="${task.name}.pth"`,
    });
  }
}