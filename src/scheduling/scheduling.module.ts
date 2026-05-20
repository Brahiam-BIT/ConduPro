import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { Classroom } from './entity/classroom.entity';
import { Schedule } from './entity/schedule.entity';
import { Vehicle } from './entity/vehicle.entity';
import { ClassroomRepository } from './repository/classroom.repository';
import { ScheduleRepository } from './repository/schedule.repository';
import { VehicleRepository } from './repository/vehicle.repository';
import { SchedulesController } from './schedules.controller';
import { SchedulingService } from './scheduling.service';
import { SchedulingValidationService } from './service/scheduling-validation.service';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, Classroom, Schedule]),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [SchedulesController, VehiclesController],
  providers: [
    SchedulingService,
    SchedulingValidationService,
    VehiclesService,
    ScheduleRepository,
    VehicleRepository,
    ClassroomRepository,
  ],
  exports: [
    SchedulingService,
    SchedulingValidationService,
    VehiclesService,
    ScheduleRepository,
    VehicleRepository,
    ClassroomRepository,
  ],
})
export class SchedulingModule {}
