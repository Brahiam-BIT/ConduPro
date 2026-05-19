import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Schedule } from './schedule.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  plate!: string;

  @Column()
  brand!: string;

  @Column()
  model!: string;

  @Column({ type: 'int' })
  year!: number;

  @Column({ name: 'is_available', default: true })
  isAvailable!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => Schedule, (schedule) => schedule.vehicle)
  schedules!: Schedule[];
}
