import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../users/entity/user.entity';
import { TheoryTopic } from './theory-topic.entity';

@Entity('theory_topic_materials')
export class TheoryTopicMaterial {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'theory_topic_id', type: 'uuid' })
  theoryTopicId!: string;

  @ManyToOne(() => TheoryTopic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'theory_topic_id' })
  theoryTopic!: TheoryTopic;

  @Column({ name: 'instructor_id', type: 'uuid' })
  instructorId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instructor_id' })
  instructor!: User;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'original_file_name' })
  originalFileName!: string;

  @Column({ name: 'stored_file_name' })
  storedFileName!: string;

  @Column({ name: 'mime_type' })
  mimeType!: string;

  @Column({ name: 'file_size_bytes', type: 'bigint' })
  fileSizeBytes!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
