import { randomBytes } from 'crypto';

const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateBookingReference(): string {
  const bytes = randomBytes(6);
  let reference = 'BUS';

  for (let i = 0; i < 6; i++) {
    reference += CHARSET[bytes[i] % CHARSET.length];
  }

  return reference;
}
