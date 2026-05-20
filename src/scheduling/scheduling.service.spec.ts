import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UserRole } from '../common/enums/user-role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { Schedule } from './entity/schedule.entity';
import { ScheduleStatus } from './enums/schedule-status.enum';
import { ScheduleType } from './enums/schedule-type.enum';
import { ClassroomRepository } from './repository/classroom.repository';
import { ScheduleRepository } from './repository/schedule.repository';
import { VehicleRepository } from './repository/vehicle.repository';
import { SchedulingService } from './scheduling.service';
import { SchedulingValidationService } from './service/scheduling-validation.service';

describe('SchedulingService', () => {
  let service: SchedulingService;
  let validationService: SchedulingValidationService;

  const adminUser: JwtPayload = {
    sub: 'admin-id',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
  };

  const scheduleRepository = {
    findByFilters: jest.fn(),
    findById: jest.fn(),
    findConflicts: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    updateStatus: jest.fn(),
    softDelete: jest.fn(),
    findInstructorSchedulesForDay: jest.fn(),
  };

  const vehicleRepository = {
    findById: jest.fn(),
    findAvailable: jest.fn(),
  };

  const classroomRepository = {
    findById: jest.fn(),
    findAvailable: jest.fn(),
  };

  const usersService = {
    findByIdOrFail: jest.fn(),
  };

  const notificationsService = {
    notifyScheduleConfirmed: jest.fn().mockResolvedValue(undefined),
    notifyScheduleCancelled: jest.fn().mockResolvedValue(undefined),
  };

  const futureStart = (): Date => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    date.setHours(10, 0, 0, 0);
    return date;
  };

  const mockSchedule = (overrides: Partial<Schedule> = {}): Schedule =>
    ({
      id: 'schedule-id',
      type: ScheduleType.THEORY,
      studentId: 'student-id',
      instructorId: 'instructor-id',
      vehicleId: null,
      classroomId: 'classroom-id',
      startTime: futureStart(),
      endTime: new Date(futureStart().getTime() + 60 * 60 * 1000),
      status: ScheduleStatus.PENDING,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      student: {
        id: 'student-id',
        firstName: 'Ana',
        lastName: 'Test',
        email: 'student@test.com',
        role: UserRole.STUDENT,
        isActive: true,
      },
      instructor: {
        id: 'instructor-id',
        firstName: 'Carlos',
        lastName: 'Méndez',
        email: 'instructor@test.com',
        role: UserRole.INSTRUCTOR,
        isActive: true,
      },
      classroom: { id: 'classroom-id', name: 'Aula 1' },
      vehicle: null,
      ...overrides,
    }) as Schedule;

  const baseDto = (): CreateScheduleDto => ({
    type: ScheduleType.THEORY,
    studentId: 'student-id',
    instructorId: 'instructor-id',
    classroomId: 'classroom-id',
    startTime: futureStart(),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        SchedulingValidationService,
        { provide: ScheduleRepository, useValue: scheduleRepository },
        { provide: VehicleRepository, useValue: vehicleRepository },
        { provide: ClassroomRepository, useValue: classroomRepository },
        { provide: UsersService, useValue: usersService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get(SchedulingService);
    validationService = module.get(SchedulingValidationService);

    usersService.findByIdOrFail.mockImplementation(async (id: string) => {
      if (id === 'student-id') {
        return { id, role: UserRole.STUDENT, isActive: true };
      }
      return { id, role: UserRole.INSTRUCTOR, isActive: true };
    });

    classroomRepository.findById.mockResolvedValue({ id: 'classroom-id', isAvailable: true });
    scheduleRepository.create.mockImplementation((data) => data);
    scheduleRepository.save.mockImplementation(async (data) => ({ ...data, id: 'schedule-id' }));
  });

  describe('create', () => {
    it('debe crear una clase sin conflictos', async () => {
      scheduleRepository.findConflicts.mockResolvedValue([]);
      scheduleRepository.findById.mockResolvedValue(mockSchedule());

      const result = await service.create(baseDto(), adminUser);

      expect(result.id).toBe('schedule-id');
      expect(scheduleRepository.save).toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si hay conflicto de horario', async () => {
      scheduleRepository.findConflicts.mockResolvedValue([mockSchedule()]);

      await expect(service.create(baseDto(), adminUser)).rejects.toThrow(ConflictException);
    });

    it('debe rechazar creación por estudiante sin permisos', async () => {
      const studentUser: JwtPayload = {
        sub: 'student-id',
        email: 'student@test.com',
        role: UserRole.STUDENT,
      };

      await expect(service.create(baseDto(), studentUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createConfirmed (auto-asignación)', () => {
    it('debe crear clase CONFIRMED y notificar', async () => {
      scheduleRepository.findConflicts.mockResolvedValue([]);
      scheduleRepository.findById.mockResolvedValue(
        mockSchedule({ status: ScheduleStatus.CONFIRMED }),
      );

      const schedule = await service.createConfirmed(baseDto());

      expect(schedule.status).toBe(ScheduleStatus.CONFIRMED);
      expect(notificationsService.notifyScheduleConfirmed).toHaveBeenCalled();
    });
  });

  describe('isSlotAvailable', () => {
    it('debe retornar false si hay conflictos', async () => {
      scheduleRepository.findConflicts.mockResolvedValue([mockSchedule()]);

      const available = await service.isSlotAvailable({
        type: ScheduleType.THEORY,
        studentId: 'student-id',
        instructorId: 'instructor-id',
        startTime: futureStart(),
        endTime: new Date(futureStart().getTime() + 60 * 60 * 1000),
        classroomId: 'classroom-id',
      });

      expect(available).toBe(false);
    });

    it('debe retornar true si el slot es válido y sin conflictos', async () => {
      scheduleRepository.findConflicts.mockResolvedValue([]);

      const available = await service.isSlotAvailable({
        type: ScheduleType.THEORY,
        studentId: 'student-id',
        instructorId: 'instructor-id',
        startTime: futureStart(),
        endTime: new Date(futureStart().getTime() + 60 * 60 * 1000),
        classroomId: 'classroom-id',
      });

      expect(available).toBe(true);
    });
  });
});
