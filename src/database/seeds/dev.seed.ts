import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';

import { BCRYPT_SALT_ROUNDS } from '../../common/constants/auth.constants';
import { UserRole } from '../../common/enums/user-role.enum';
import { Classroom } from '../../scheduling/entity/classroom.entity';
import { Schedule } from '../../scheduling/entity/schedule.entity';
import { Vehicle } from '../../scheduling/entity/vehicle.entity';
import { ScheduleStatus } from '../../scheduling/enums/schedule-status.enum';
import { ScheduleType } from '../../scheduling/enums/schedule-type.enum';
import {
  addMs,
  buildSlotStart,
  isWorkingDay,
  startOfDay,
} from '../../scheduling/utils/scheduling-time.util';
import { User } from '../../users/entity/user.entity';

/** Marca en `notes` para detectar clases creadas por el seed y no duplicarlas. */
export const SEED_SCHEDULE_MARKER = 'seed:dev';

export const SEED_PASSWORD = 'Password123!';

export interface SeedUserSpec {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
}

export const SEED_USERS: SeedUserSpec[] = [
  {
    email: 'admin@condupro.local',
    firstName: 'Ana',
    lastName: 'Administradora',
    role: UserRole.ADMIN,
    phone: '+573000000001',
  },
  {
    email: 'instructor1@condupro.local',
    firstName: 'Carlos',
    lastName: 'Rodríguez',
    role: UserRole.INSTRUCTOR,
    phone: '+573000000002',
  },
  {
    email: 'instructor2@condupro.local',
    firstName: 'María',
    lastName: 'Gómez',
    role: UserRole.INSTRUCTOR,
    phone: '+573000000003',
  },
  {
    email: 'student1@condupro.local',
    firstName: 'Juan',
    lastName: 'Pérez',
    role: UserRole.STUDENT,
    phone: '+573000000004',
  },
  {
    email: 'student2@condupro.local',
    firstName: 'Laura',
    lastName: 'Martínez',
    role: UserRole.STUDENT,
    phone: '+573000000005',
  },
];

const SEED_VEHICLES: Array<Pick<Vehicle, 'plate' | 'brand' | 'model' | 'year' | 'isAvailable'>> = [
  { plate: 'ABC-123', brand: 'Chevrolet', model: 'Spark', year: 2022, isAvailable: true },
  { plate: 'XYZ-789', brand: 'Renault', model: 'Logan', year: 2021, isAvailable: true },
  { plate: 'CPR-001', brand: 'Kia', model: 'Rio', year: 2023, isAvailable: true },
];

const SEED_CLASSROOMS: Array<Pick<Classroom, 'name' | 'capacity' | 'isAvailable'>> = [
  { name: 'Aula Teórica 1', capacity: 25, isAvailable: true },
  { name: 'Aula Teórica 2', capacity: 20, isAvailable: true },
  { name: 'Aula Teórica 3', capacity: 18, isAvailable: true },
];

function getNextWorkingDay(from: Date = new Date()): Date {
  let cursor = startOfDay(addMs(from, 24 * 60 * 60 * 1000));

  for (let i = 0; i < 14; i++) {
    if (isWorkingDay(cursor)) {
      return cursor;
    }
    cursor = addMs(cursor, 24 * 60 * 60 * 1000);
  }

  return cursor;
}

async function upsertUser(
  repo: Repository<User>,
  passwordHash: string,
  spec: SeedUserSpec,
): Promise<User> {
  const email = spec.email.toLowerCase();
  const existing = await repo.findOne({ where: { email } });

  if (existing) {
    existing.firstName = spec.firstName;
    existing.lastName = spec.lastName;
    existing.role = spec.role;
    existing.phone = spec.phone ?? null;
    existing.isActive = true;
    existing.password = passwordHash;
    return repo.save(existing);
  }

  return repo.save(
    repo.create({
      email,
      password: passwordHash,
      firstName: spec.firstName,
      lastName: spec.lastName,
      phone: spec.phone ?? null,
      role: spec.role,
      isActive: true,
    }),
  );
}

async function upsertVehicle(
  repo: Repository<Vehicle>,
  data: (typeof SEED_VEHICLES)[number],
): Promise<Vehicle> {
  const existing = await repo.findOne({ where: { plate: data.plate } });
  if (existing) {
    existing.brand = data.brand;
    existing.model = data.model;
    existing.year = data.year;
    existing.isAvailable = data.isAvailable;
    return repo.save(existing);
  }
  return repo.save(repo.create(data));
}

async function upsertClassroom(
  repo: Repository<Classroom>,
  data: (typeof SEED_CLASSROOMS)[number],
): Promise<Classroom> {
  const existing = await repo.findOne({ where: { name: data.name } });
  if (existing) {
    existing.capacity = data.capacity;
    existing.isAvailable = data.isAvailable;
    return repo.save(existing);
  }
  return repo.save(repo.create(data));
}

async function seedDemoSchedules(
  scheduleRepo: Repository<Schedule>,
  users: Map<string, User>,
  vehicles: Vehicle[],
  classrooms: Classroom[],
): Promise<number> {
  const existingSeedCount = await scheduleRepo.count({
    where: { notes: SEED_SCHEDULE_MARKER },
  });

  if (existingSeedCount > 0) {
    return 0;
  }

  const student1 = users.get('student1@condupro.local');
  const student2 = users.get('student2@condupro.local');
  const instructor1 = users.get('instructor1@condupro.local');
  const instructor2 = users.get('instructor2@condupro.local');

  if (!student1 || !student2 || !instructor1 || !instructor2) {
    throw new Error('Faltan usuarios base del seed');
  }

  const vehicle = vehicles.find((v) => v.plate === 'ABC-123') ?? vehicles[0];
  const classroom =
    classrooms.find((c) => c.name === 'Aula Teórica 1') ?? classrooms[0];

  if (!vehicle || !classroom) {
    throw new Error('Faltan vehículo o aula para clases de demostración');
  }

  const day = getNextWorkingDay();
  const nextDay = addMs(day, 24 * 60 * 60 * 1000);

  const schedules: Array<Partial<Schedule>> = [
    {
      type: ScheduleType.PRACTICE,
      studentId: student1.id,
      instructorId: instructor1.id,
      vehicleId: vehicle.id,
      classroomId: null,
      startTime: buildSlotStart(day, 10),
      endTime: buildSlotStart(day, 11),
      status: ScheduleStatus.CONFIRMED,
      notes: SEED_SCHEDULE_MARKER,
    },
    {
      type: ScheduleType.THEORY,
      studentId: student2.id,
      instructorId: instructor2.id,
      vehicleId: null,
      classroomId: classroom.id,
      startTime: buildSlotStart(day, 14),
      endTime: buildSlotStart(day, 15),
      status: ScheduleStatus.PENDING,
      notes: SEED_SCHEDULE_MARKER,
    },
    {
      type: ScheduleType.PRACTICE,
      studentId: student2.id,
      instructorId: instructor1.id,
      vehicleId: vehicle.id,
      classroomId: null,
      startTime: buildSlotStart(isWorkingDay(nextDay) ? nextDay : day, 9),
      endTime: buildSlotStart(isWorkingDay(nextDay) ? nextDay : day, 10),
      status: ScheduleStatus.PENDING,
      notes: SEED_SCHEDULE_MARKER,
    },
  ];

  await scheduleRepo.save(schedules.map((s) => scheduleRepo.create(s)));
  return schedules.length;
}

export async function runDevSeed(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(User);
  const vehicleRepo = dataSource.getRepository(Vehicle);
  const classroomRepo = dataSource.getRepository(Classroom);
  const scheduleRepo = dataSource.getRepository(Schedule);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_SALT_ROUNDS);

  const usersByEmail = new Map<string, User>();
  for (const spec of SEED_USERS) {
    const user = await upsertUser(userRepo, passwordHash, spec);
    usersByEmail.set(spec.email.toLowerCase(), user);
  }

  const vehicles: Vehicle[] = [];
  for (const spec of SEED_VEHICLES) {
    vehicles.push(await upsertVehicle(vehicleRepo, spec));
  }

  const classrooms: Classroom[] = [];
  for (const spec of SEED_CLASSROOMS) {
    classrooms.push(await upsertClassroom(classroomRepo, spec));
  }

  const schedulesCreated = await seedDemoSchedules(
    scheduleRepo,
    usersByEmail,
    vehicles,
    classrooms,
  );

  const day = getNextWorkingDay();

  // eslint-disable-next-line no-console
  console.log('\n=== Seed de desarrollo ConduPro ===\n');
  // eslint-disable-next-line no-console
  console.log(`Contraseña para todos los usuarios: ${SEED_PASSWORD}\n`);
  // eslint-disable-next-line no-console
  console.log('Usuarios:');
  for (const spec of SEED_USERS) {
    const user = usersByEmail.get(spec.email.toLowerCase());
    // eslint-disable-next-line no-console
    console.log(`  - ${spec.role.padEnd(10)} ${spec.email}  (id: ${user?.id})`);
  }
  // eslint-disable-next-line no-console
  console.log(`\nVehículos: ${vehicles.length} | Aulas: ${classrooms.length}`);
  // eslint-disable-next-line no-console
  console.log(
    schedulesCreated > 0
      ? `Clases demo creadas: ${schedulesCreated} (próximo día hábil: ${day.toISOString().slice(0, 10)})`
      : `Clases demo: ya existían (${await scheduleRepo.count({ where: { notes: SEED_SCHEDULE_MARKER } })} con marca seed)`,
  );
  // eslint-disable-next-line no-console
  console.log('\nPrueba auto-assign con student1@condupro.local (PRACTICE o THEORY).\n');
}
