import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import type { GoogleUserPayload } from '@app/shared/type/request-with-google-user.interface';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): GoogleUserPayload {
    const { id, emails, displayName, photos } = profile;

    return {
      providerId: id,
      email: emails?.[0]?.value || '',
      fullName: displayName || '',
      avatar: photos?.[0]?.value || '',
      authProvider: 'google',
    };
  }
}
