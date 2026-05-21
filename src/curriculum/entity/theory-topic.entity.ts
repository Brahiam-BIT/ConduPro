import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { LicenseCategory } from './license-category.entity';

@Entity('theory_topics')
export class TheoryTopic {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'license_category_id', type: 'uuid' })
  licenseCategoryId!: string;

  @ManyToOne(() => LicenseCategory, (category) => category.theoryTopics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'license_category_id' })
  licenseCategory!: LicenseCategory;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'session_capacity', type: 'int', default: 20 })
  sessionCapacity!: number;

  @Column({ name: 'estimated_hours', type: 'decimal', precision: 5, scale: 2, nullable: true })
  estimatedHours!: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
