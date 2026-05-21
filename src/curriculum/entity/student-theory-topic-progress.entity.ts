import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Schedule } from '../../scheduling/entity/schedule.entity';
import { TheoryTopic } from './theory-topic.entity';
import { StudentLicenseEnrollment } from './student-license-enrollment.entity';

@Entity('student_theory_topic_progress')
export class StudentTheoryTopicProgress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'enrollment_id', type: 'uuid' })
  enrollmentId!: string;

  @ManyToOne(() => StudentLicenseEnrollment, (e) => e.theoryProgress, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment!: StudentLicenseEnrollment;

  @Column({ name: 'theory_topic_id', type: 'uuid' })
  theoryTopicId!: string;

  @ManyToOne(() => TheoryTopic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'theory_topic_id' })
  theoryTopic!: TheoryTopic;

  @Column({ name: 'schedule_id', type: 'uuid', nullable: true })
  scheduleId!: string | null;

  @ManyToOne(() => Schedule, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'schedule_id' })
  schedule!: Schedule | null;

  @CreateDateColumn({ name: 'completed_at' })
  completedAt!: Date;
}
