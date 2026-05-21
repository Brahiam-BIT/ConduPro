import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Schedule } from './schedule.entity';

@Entity('classrooms')
export class Classroom {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ type: 'int' })
  capacity!: number;

  @Column({ name: 'is_available', default: true })
  isAvailable!: boolean;

  @OneToMany(() => Schedule, (schedule) => schedule.classroom)
  schedules!: Schedule[];
}
