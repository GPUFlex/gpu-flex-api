import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
  } from '@nestjs/common';
  import { NodesService } from './nodes.service';
  import { CreateNodeDto, UpdateNodeDto } from './dto/nodes.dto';
  
  @Controller('nodes')
  export class NodesController {
    constructor(private readonly nodesService: NodesService) {}
  
    @Post()
    create(@Body() dto: CreateNodeDto) {
      return this.nodesService.create(dto);
    }
  
    @Get()
    findAll() {
      return this.nodesService.findAll();
    }
  
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.nodesService.findOne(id);
    }
  
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateNodeDto) {
      return this.nodesService.update(id, dto);
    }
  
    @Delete(':id')
    remove(@Param('id') id: string) {
      return this.nodesService.remove(id);
    }
  }