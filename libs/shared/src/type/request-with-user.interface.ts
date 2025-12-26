import { UserRole } from '@app/shared/enums';
import { Request } from 'express';

// according to jwt strategy
export interface UserPayload {
  userId: string;
  email: string;
  role: UserRole;
  status: string;
}

export interface RequestWithUser extends Request {
  user: UserPayload;
}
