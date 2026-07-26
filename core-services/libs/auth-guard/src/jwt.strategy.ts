import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, RequestUser } from '@drishti/common';

/** JWT strategy — validates the bearer token and extracts user context */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'drishti_jwt_super_secret_hackathon_2026'),
    });
  }

  validate(payload: JwtPayload): RequestUser {
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      unitId: payload.unitId,
      jurisdictionPath: payload.jurisdictionPath,
    };
  }
}
