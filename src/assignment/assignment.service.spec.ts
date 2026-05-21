import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UserRole } from '../common/enums/user-role.enum';
import { ScheduleType } from '../scheduling/enums/schedule-type.enum';
import { ClassroomRepository } from '../scheduling/repository/classroom.repository';
import { VehicleRepository } from '../scheduling/repository/vehicle.repository';
import { SchedulingService } from '../scheduling/scheduling.service';
import { StudentEnrollmentService } from '../curriculum/student-enrollment.service';
import { InstructorAvailabilityRepository } from '../users/repository/instructor-availability.repository';
import { UsersService } from '../users/users.service';
import { AssignmentService } from './assignment.service';

describe('AssignmentService', () => {
  let service: AssignmentService;

  const usersService = {
    findByIdOrFail: jest.fn(),
    findActiveByRole: jest.fn(),
  };

  const schedulingService = {
    isSlotAvailable: jest.fn(),
    createConfirmed: jest.fn(),
    toResponseDto: jest.fn(),
  };

  const vehicleRepository = {
    findAvailable: jest.fn(),
  };

  const classroomRepository = {
    findAvailable: jest.fn(),
  };

  const enrollmentService = {
    resolvePrimaryActiveEnrollment: jest.fn().mockResolvedValue(null),
  };

  const availabilityRepository = {
    findByInstructor: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentService,
        { provide: SchedulingService, useValue: schedulingService },
        { provide: UsersService, useValue: usersService },
        { provide: VehicleRepository, useValue: vehicleRepository },
        { provide: ClassroomRepository, useValue: classroomRepository },
        { provide: StudentEnrollmentService, useValue: enrollmentService },
        { provide: InstructorAvailabilityRepository, useValue: availabilityRepository },
      ],
    }).compile();

    service = module.get(AssignmentService);

    usersService.findByIdOrFail.mockResolvedValue({
      id: 'student-id',
      role: UserRole.STUDENT,
    });
  });

  it('debe lanzar NotFoundException si no hay instructores disponibles', async () => {
    usersService.findActiveByRole.mockResolvedValue([]);

    await expect(
      service.autoAssign({
        studentId: 'student-id',
        type: ScheduleType.PRACTICE,
      }),
    ).rejects.toThrow(new NotFoundException('No hay instructores disponibles'));
  });

  it('debe asignar automáticamente cuando hay disponibilidad', async () => {
    usersService.findActiveByRole.mockResolvedValue([
      { id: 'instructor-id', role: UserRole.INSTRUCTOR, isActive: true },
    ]);
    vehicleRepository.findAvailable.mockResolvedValue([{ id: 'vehicle-id' }]);
    schedulingService.isSlotAvailable.mockResolvedValue(true);
    schedulingService.createConfirmed.mockResolvedValue({ id: 'new-schedule-id' });
    schedulingService.toResponseDto.mockReturnValue({ id: 'new-schedule-id' });

    const result = await service.autoAssign({
      studentId: 'student-id',
      type: ScheduleType.PRACTICE,
    });

    expect(result.id).toBe('new-schedule-id');
    expect(schedulingService.createConfirmed).toHaveBeenCalled();
  });
});
