import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoDatabaseController } from './demo-database.controller';
import { DemoDatabaseService } from './demo-database.service';
import { DemoSubscriber } from './demo.subscriber';
import { Demo } from './entities/demo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Demo])],
  controllers: [DemoDatabaseController],
  providers: [DemoDatabaseService, DemoSubscriber],
})
export class DemoDatabaseModule {}
