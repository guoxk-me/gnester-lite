import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoDatabaseController } from './demo-database.controller';
import { DemoDatabaseService } from './demo-database.service';
import { Demo } from './entities/demo.entity';

// CN: 演示 TypeORM 数据库 CRUD；EN: Demonstrates TypeORM database CRUD.
@Module({
  imports: [TypeOrmModule.forFeature([Demo])],
  controllers: [DemoDatabaseController],
  providers: [DemoDatabaseService],
})
export class DemoDatabaseModule {}
