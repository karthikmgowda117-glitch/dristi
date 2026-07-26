import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { RoleEntity } from './role.entity';
import { UnitEntity } from './unit.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  user_id: string;

  @Column({ type: 'uuid' })
  unit_id: string;

  @Column({ type: 'int' })
  role_id: number;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  keycloak_subject: string;

  @Column({ nullable: true })
  password_hash: string;

  @Column({ default: 'en' })
  language_pref: string;

  @Column({ default: false })
  mfa_enabled: boolean;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => RoleEntity)
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;

  @ManyToOne(() => UnitEntity)
  @JoinColumn({ name: 'unit_id' })
  unit: UnitEntity;
}
