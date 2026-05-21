import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VehicleRepository } from '../scheduling/repository/vehicle.repository';
import { Vehicle } from '../scheduling/entity/vehicle.entity';
import { Schedule } from '../scheduling/entity/schedule.entity';
import { User } from '../users/entity/user.entity';
import { UsersModule } from '../users/users.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './repository/reports.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Schedule, User, Vehicle]), UsersModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository, VehicleRepository],
})
export class ReportsModule {}
