import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoDatabaseController } from './demo-database.controller.js';
import { DemoDatabaseService } from './demo-database.service.js';
import { Demo } from './entities/demo.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Demo])],
  controllers: [DemoDatabaseController],
  providers: [DemoDatabaseService],
})
export class DemoDatabaseModule {}
