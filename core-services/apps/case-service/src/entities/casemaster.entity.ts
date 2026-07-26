import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { UnitEntity } from './unit.entity';
import { UserEntity } from './user.entity';

@Entity('casemaster')
export class CasemasterEntity {
  @PrimaryGeneratedColumn('uuid')
  case_master_id: string;

  @Column({ type: 'uuid' })
  unit_id: string;

  @Column({ type: 'int' })
  crime_major_head_id: number;

  @Column({ type: 'int' })
  crime_minor_head_id: number;

  @Column()
  fir_number: string;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  longitude: number;

  @Column({ type: 'date' })
  incident_from_date: string;

  @Column({ type: 'date', nullable: true })
  incident_to_date: string;

  @Column({ default: 'REGISTERED' })
  status: string;

  @Column({ type: 'uuid', nullable: true })
  assigned_officer_id: string;

  @Column({ type: 'text', nullable: true })
  narrative: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => UnitEntity)
  @JoinColumn({ name: 'unit_id' })
  unit: UnitEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'assigned_officer_id' })
  assigned_officer: UserEntity;
}
