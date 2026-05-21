import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TheoryClassOffersService } from '../assignment/theory-class-offers.service';
import { PracticeClassOffersService } from '../assignment/practice-class-offers.service';
import { CurriculumModule } from '../curriculum/curriculum.module';
import { StudentLicenseEnrollment } from '../curriculum/entity/student-license-enrollment.entity';
import { StudentTheoryTopicProgress } from '../curriculum/entity/student-theory-topic-progress.entity';
import { TheoryTopic } from '../curriculum/entity/theory-topic.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { InstructorAvailabilitySlot } from '../users/entity/instructor-availability-slot.entity';
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
    TypeOrmModule.forFeature([
      Vehicle,
      Classroom,
      Schedule,
      InstructorAvailabilitySlot,
      StudentLicenseEnrollment,
      StudentTheoryTopicProgress,
      TheoryTopic,
    ]),
    UsersModule,
    NotificationsModule,
    CurriculumModule,
  ],
  controllers: [SchedulesController, VehiclesController],
  providers: [
    SchedulingService,
    SchedulingValidationService,
    VehiclesService,
    ScheduleRepository,
    VehicleRepository,
    ClassroomRepository,
    TheoryClassOffersService,
    PracticeClassOffersService,
  ],
  exports: [
    SchedulingService,
    SchedulingValidationService,
    VehiclesService,
    ScheduleRepository,
    VehicleRepository,
    ClassroomRepository,
    TheoryClassOffersService,
    PracticeClassOffersService,
  ],
})
export class SchedulingModule {}
