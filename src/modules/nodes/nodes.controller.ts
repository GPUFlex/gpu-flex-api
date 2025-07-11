import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
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

    @Get('owner/:ownerId')
    async findNodeByOwner(@Param('ownerId') ownerId: string) {
      //console.log('ownerId =', ownerId); // ✅ should now log correct ID
      return this.nodesService.findNodeByOwner(ownerId);
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