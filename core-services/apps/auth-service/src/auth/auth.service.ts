import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from '../entities/user.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { JwtPayload, RoleName } from '@drishti/common';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly tokenRepo: Repository<RefreshTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Login (mock JWT — no Keycloak) ─────────────────────────────────────

  async login(username: string, password: string): Promise<TokenPair> {
    const user = await this.userRepo.findOne({
      where: { username, is_active: true },
      relations: ['role', 'unit'],
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Mock mode: accept 'password123' for all demo users OR bcrypt verify
    let valid = false;
    if (password === 'password123') {
      valid = true; // Demo shortcut for seeded users
    } else if (user.password_hash) {
      valid = await bcrypt.compare(password, user.password_hash);
    }
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (!user.is_active) throw new ForbiddenException('Account is disabled');

    // Build jurisdiction path (walk unit hierarchy upward)
    const jurisdictionPath = await this.getJurisdictionPath(user.unit_id);

    return this.issueTokenPair(user, jurisdictionPath);
  }

  // ─── MFA Verify (mock: accepts any 6-digit code) ─────────────────────────

  async verifyMfa(partialToken: string, totpCode: string): Promise<TokenPair> {
    // Mock MFA: verify partial token, then check any 6-digit code
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(partialToken, {
        secret: this.config.get('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired MFA session token');
    }

    if (!/^\d{6}$/.test(totpCode)) {
      throw new BadRequestException('TOTP code must be 6 digits');
    }

    const user = await this.userRepo.findOne({
      where: { user_id: payload.sub },
      relations: ['role', 'unit'],
    });
    if (!user) throw new NotFoundException('User not found');

    return this.issueTokenPair(user, payload.jurisdictionPath);
  }

  // ─── Refresh ─────────────────────────────────────────────────────────────

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.tokenRepo.findOne({ where: { token_hash: tokenHash } });

    if (!stored || stored.revoked || stored.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    // Rotate — invalidate old, issue new
    stored.revoked = true;
    await this.tokenRepo.save(stored);

    const user = await this.userRepo.findOne({
      where: { user_id: stored.user_id },
      relations: ['role', 'unit'],
    });
    if (!user || !user.is_active) throw new UnauthorizedException('User not found or inactive');

    const jurisdictionPath = await this.getJurisdictionPath(user.unit_id);
    return this.issueTokenPair(user, jurisdictionPath);
  }

  // ─── Logout ──────────────────────────────────────────────────────────────

  async logout(userId: string): Promise<void> {
    await this.tokenRepo.update({ user_id: userId, revoked: false }, { revoked: true });
  }

  // ─── /me ─────────────────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.userRepo.findOne({
      where: { user_id: userId },
      relations: ['role', 'unit'],
    });
    if (!user) throw new NotFoundException('User not found');
    const jurisdictionPath = await this.getJurisdictionPath(user.unit_id);
    return {
      userId: user.user_id,
      username: user.username,
      role: user.role.role_name as RoleName,
      unitId: user.unit_id,
      unitName: user.unit?.unit_name,
      jurisdictionPath,
      language: user.language_pref,
      mfaEnabled: user.mfa_enabled,
    };
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  private async issueTokenPair(user: UserEntity, jurisdictionPath: string[]): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.user_id,
      username: user.username,
      role: user.role.role_name as RoleName,
      unitId: user.unit_id,
      jurisdictionPath,
    };

    const accessToken = this.jwtService.sign(payload);

    // Refresh token: opaque random string stored as hash
    const rawRefresh = uuidv4() + '-' + uuidv4();
    const tokenHash = this.hashToken(rawRefresh);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.tokenRepo.save(
      this.tokenRepo.create({
        user_id: user.user_id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      }),
    );

    return { accessToken, refreshToken: rawRefresh, expiresIn: 900 };
  }

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private async getJurisdictionPath(unitId: string): Promise<string[]> {
    const result = await this.dataSource.query<{ unit_id: string }[]>(
      `WITH RECURSIVE ancestors AS (
         SELECT unit_id, parent_unit_id, 0 AS depth
         FROM unit WHERE unit_id = $1
         UNION ALL
         SELECT u.unit_id, u.parent_unit_id, a.depth + 1
         FROM unit u JOIN ancestors a ON u.unit_id = a.parent_unit_id
       )
       SELECT unit_id FROM ancestors ORDER BY depth DESC`,
      [unitId],
    );
    return result.map((r) => r.unit_id);
  }
}
