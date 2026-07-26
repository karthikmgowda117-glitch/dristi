import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column({ unique: true })
  token_hash: string;

  @Column()
  expires_at: Date;

  @Column({ default: false })
  revoked: boolean;

  @CreateDateColumn()
  created_at: Date;
}
