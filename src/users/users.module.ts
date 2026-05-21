import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entity/user.entity';
import { InstructorAvailabilitySlot } from './entity/instructor-availability-slot.entity';
import { InstructorAvailabilityRepository } from './repository/instructor-availability.repository';
import { UsersRepository } from './repository/users.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, InstructorAvailabilitySlot])],
  controllers: [UsersController],
  providers: [UsersRepository, InstructorAvailabilityRepository, UsersService],
  exports: [UsersService, UsersRepository, InstructorAvailabilityRepository],
})
export class UsersModule {}
