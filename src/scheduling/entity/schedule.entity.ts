import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entity/user.entity';
import { ScheduleStatus } from '../enums/schedule-status.enum';
import { ScheduleType } from '../enums/schedule-type.enum';
import { Classroom } from './classroom.entity';
import { Vehicle } from './vehicle.entity';

@Entity('schedules')
@Index('IDX_schedules_start_time', ['startTime'])
@Index('IDX_schedules_instructor_id', ['instructorId'])
@Index('IDX_schedules_student_id', ['studentId'])
@Index('IDX_schedules_status', ['status'])
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ScheduleType })
  type!: ScheduleType;

  @Column({ name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: User;

  @Column({ name: 'instructor_id' })
  instructorId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instructor_id' })
  instructor!: User;

  @Column({ name: 'vehicle_id', nullable: true })
  vehicleId!: string | null;

  @ManyToOne(() => Vehicle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle | null;

  @Column({ name: 'classroom_id', nullable: true })
  classroomId!: string | null;

  @ManyToOne(() => Classroom, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'classroom_id' })
  classroom!: Classroom | null;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime!: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime!: Date;

  @Column({ type: 'enum', enum: ScheduleStatus, default: ScheduleStatus.PENDING })
  status!: ScheduleStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
