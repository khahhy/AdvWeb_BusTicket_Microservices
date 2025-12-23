import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  status: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET')!,
    });
  }

  validate(payload: JwtPayload) {
    // Payload contains: { sub: userId, email, role }
    if (payload.status === 'banned') {
      throw new UnauthorizedException('Account has been banned');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      status: payload.status,
    };
  }
}
