import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entity/user.entity';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';
import { LicenseCategory } from './license-category.entity';
import { StudentTheoryTopicProgress } from './student-theory-topic-progress.entity';

@Entity('student_license_enrollments')
export class StudentLicenseEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: User;

  @Column({ name: 'license_category_id', type: 'uuid' })
  licenseCategoryId!: string;

  @ManyToOne(() => LicenseCategory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'license_category_id' })
  licenseCategory!: LicenseCategory;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    enumName: 'enrollment_status_enum',
    default: EnrollmentStatus.ACTIVE,
  })
  status!: EnrollmentStatus;

  @CreateDateColumn({ name: 'enrolled_at' })
  enrolledAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => StudentTheoryTopicProgress, (p) => p.enrollment)
  theoryProgress!: StudentTheoryTopicProgress[];
}
