import {
    IsNotEmpty,
    IsString,
    IsUUID,
    IsInt,
    Min,
    IsOptional,
  } from 'class-validator';
  import { PartialType } from '@nestjs/mapped-types';
  
  export class CreateTaskDto {
    @IsString()
    @IsNotEmpty()
    name: string;
  
    /** Оцінка необхідної відеопамʼяті (МБ). Дозволяє точніше підібрати ноду */
    @IsInt()
    @IsOptional()
    //@Min(1)
    estimatedMemoryMb: number;
  
    @IsUUID()
    consumerId: string;
  }
  
  export class UpdateTaskDto extends PartialType(CreateTaskDto) {}