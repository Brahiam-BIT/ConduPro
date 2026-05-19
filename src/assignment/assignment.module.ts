import { Module } from '@nestjs/common';

import { SchedulingModule } from '../scheduling/scheduling.module';
import { UsersModule } from '../users/users.module';
import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';

@Module({
  imports: [SchedulingModule, UsersModule],
  controllers: [AssignmentController],
  providers: [AssignmentService],
})
export class AssignmentModule {}
