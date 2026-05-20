import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Schedule } from '../scheduling/entity/schedule.entity';
import { UsersModule } from '../users/users.module';
import { CurriculumService } from './curriculum.service';
import { LicenseCategory } from './entity/license-category.entity';
import { StudentLicenseEnrollment } from './entity/student-license-enrollment.entity';
import { StudentTheoryTopicProgress } from './entity/student-theory-topic-progress.entity';
import { TheoryTopic } from './entity/theory-topic.entity';
import { LicenseCategoriesController } from './license-categories.controller';
import { StudentEnrollmentService } from './student-enrollment.service';
import { StudentEnrollmentsController } from './student-enrollments.controller';
import { TheoryTopicsController } from './theory-topics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LicenseCategory,
      TheoryTopic,
      StudentLicenseEnrollment,
      StudentTheoryTopicProgress,
      Schedule,
    ]),
    UsersModule,
  ],
  controllers: [
    LicenseCategoriesController,
    TheoryTopicsController,
    StudentEnrollmentsController,
  ],
  providers: [CurriculumService, StudentEnrollmentService],
  exports: [CurriculumService, StudentEnrollmentService],
})
export class CurriculumModule {}
