import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('case_timeline_event')
export class CaseTimelineEventEntity {
  @PrimaryGeneratedColumn('uuid')
  event_id: string;

  @Column({ type: 'uuid' })
  case_master_id: string;

  @Column()
  event_type: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('task')
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  task_id: string;

  @Column({ type: 'uuid' })
  case_master_id: string;

  @Column({ type: 'uuid' })
  assigned_user_id: string;

  @Column()
  description: string;

  @Column({ default: 'OPEN' })
  status: string;

  @Column({ type: 'date', nullable: true })
  due_date: string;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('act_section_association')
export class ActSectionAssociationEntity {
  @PrimaryGeneratedColumn('uuid')
  association_id: string;

  @Column({ type: 'uuid' })
  case_master_id: string;

  @Column({ type: 'int' })
  act_id: number;

  @Column({ type: 'int' })
  section_id: number;
}

@Entity('unit')
export class UnitEntity {
  @PrimaryGeneratedColumn('uuid')
  unit_id: string;

  @Column({ nullable: true })
  parent_unit_id: string;

  @Column()
  unit_name: string;

  @Column()
  unit_type: string;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  user_id: string;

  @Column()
  username: string;

  @Column()
  unit_id: string;

  @Column({ type: 'int' })
  role_id: number;
}

@Entity('crime_major_head')
export class CrimeMajorHeadEntity {
  @PrimaryGeneratedColumn()
  crime_major_head_id: number;

  @Column()
  name: string;
}

@Entity('crime_minor_head')
export class CrimeMinorHeadEntity {
  @PrimaryGeneratedColumn()
  crime_minor_head_id: number;

  @Column({ type: 'int' })
  crime_major_head_id: number;

  @Column()
  name: string;
}

@Entity('act_master')
export class ActMasterEntity {
  @PrimaryGeneratedColumn()
  act_id: number;

  @Column()
  act_name: string;
}

@Entity('section_master')
export class SectionMasterEntity {
  @PrimaryGeneratedColumn()
  section_id: number;

  @Column({ type: 'int' })
  act_id: number;

  @Column()
  section_number: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}
