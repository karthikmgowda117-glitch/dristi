import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';

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
