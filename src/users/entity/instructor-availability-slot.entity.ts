import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { LicenseCategory } from '../../curriculum/entity/license-category.entity';
import { TheoryTopic } from '../../curriculum/entity/theory-topic.entity';
import { AvailabilityClassType } from '../enums/availability-class-type.enum';
import { AvailabilityRecurrence } from '../enums/availability-recurrence.enum';
import { User } from './user.entity';

@Entity('instructor_availability_slots')
export class InstructorAvailabilitySlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'instructor_id', type: 'uuid' })
  instructorId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instructor_id' })
  instructor!: User;

  /** 1=lunes … 5=viernes (academia solo días laborales). */
  @Column({ name: 'day_of_week', type: 'smallint' })
  dayOfWeek!: number;

  /** Fecha concreta (YYYY-MM-DD). Si está definida, la franja solo aplica ese día. */
  @Column({ name: 'slot_date', type: 'date', nullable: true })
  slotDate!: string | null;

  @Column({ type: 'smallint' })
  hour!: number;

  @Column({ default: true })
  available!: boolean;

  @Column({
    name: 'class_type',
    type: 'enum',
    enum: AvailabilityClassType,
    enumName: 'availability_class_type_enum',
    default: AvailabilityClassType.PRACTICE,
  })
  classType!: AvailabilityClassType;

  @Column({ name: 'theory_topic_id', type: 'uuid', nullable: true })
  theoryTopicId!: string | null;

  @ManyToOne(() => TheoryTopic, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'theory_topic_id' })
  theoryTopic!: TheoryTopic | null;

  @Column({ name: 'license_category_id', type: 'uuid', nullable: true })
  licenseCategoryId!: string | null;

  @ManyToOne(() => LicenseCategory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'license_category_id' })
  licenseCategory!: LicenseCategory | null;

  @Column({
    type: 'enum',
    enum: AvailabilityRecurrence,
    enumName: 'availability_recurrence_enum',
    default: AvailabilityRecurrence.WEEKLY,
  })
  recurrence!: AvailabilityRecurrence;

  /** Semana del mes (1–4) para MONTHLY_NTH, ej. tercer martes → 3. */
  @Column({ name: 'month_week', type: 'smallint', nullable: true })
  monthWeek!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
