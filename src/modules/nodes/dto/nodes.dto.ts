import {
    IsNotEmpty,
    IsString,
    IsInt,
    IsUUID,
    IsOptional,
    IsEnum,
    Min,
  } from 'class-validator';
  import { NodeStatus } from '@prisma/client';
  import { PartialType } from '@nestjs/mapped-types';
  
  export class CreateNodeDto {  
    @IsString()
    @IsNotEmpty()
    gpuModel: string;          // "RTX 3090"

    @IsString()
    @IsNotEmpty()
    nodeUrl: string;          // "http://worker1:5000"
  
    @IsInt()
    @Min(1)
    totalMemoryMb: number;     // e.g. 24576
  
    @IsUUID()
    ownerId: string;           // User.id
  }
  
  export class UpdateNodeDto extends PartialType(CreateNodeDto) {
    @IsOptional()
    @IsInt()
    @Min(0)
    freeMemoryMb?: number;
  
    @IsOptional()
    @IsEnum(NodeStatus)
    status?: NodeStatus;
  }