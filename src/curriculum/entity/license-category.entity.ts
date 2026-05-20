import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { LicenseGroup } from '../enums/license-group.enum';
import { TheoryTopic } from './theory-topic.entity';

@Entity('license_categories')
export class LicenseCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 8, unique: true })
  code!: string;

  @Column()
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'enum', enum: LicenseGroup, enumName: 'license_group_enum' })
  group!: LicenseGroup;

  @Column({ name: 'group_label' })
  groupLabel!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'default_theory_capacity', type: 'int', default: 20 })
  defaultTheoryCapacity!: number;

  /** Clases prácticas (1 estudiante) requeridas para obtener esta licencia. */
  @Column({ name: 'required_practice_sessions', type: 'int', default: 0 })
  requiredPracticeSessions!: number;

  /** Si true, el estudiante debe completar todos los temas teóricos activos del temario. */
  @Column({ name: 'requires_all_theory_topics', default: true })
  requiresAllTheoryTopics!: boolean;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => TheoryTopic, (topic) => topic.licenseCategory)
  theoryTopics!: TheoryTopic[];
}
