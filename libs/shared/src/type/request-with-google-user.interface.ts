import { Request } from 'express';

export interface GoogleUserPayload {
  providerId: string;
  email: string;
  fullName: string;
  avatar: string;
  authProvider: 'google';
}

export interface RequestWithGoogleUser extends Request {
  user: GoogleUserPayload;
}
