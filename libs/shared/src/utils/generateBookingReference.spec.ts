import { generateBookingReference } from './generateBookingReference';

describe('generateBookingReference', () => {
  it('should generate a booking reference starting with BUS', () => {
    const reference = generateBookingReference();

    expect(reference).toMatch(/^BUS[A-Z0-9]{6}$/);
    expect(reference).toHaveLength(9);
  });

  it('should generate unique references', () => {
    const references = new Set<string>();
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      references.add(generateBookingReference());
    }

    // Most references should be unique (allowing for some rare collisions)
    expect(references.size).toBeGreaterThan(iterations * 0.99);
  });

  it('should only use allowed characters', () => {
    const allowedChars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    for (let i = 0; i < 100; i++) {
      const reference = generateBookingReference();
      const code = reference.substring(3); // Remove 'BUS' prefix

      for (const char of code) {
        expect(allowedChars).toContain(char);
      }
    }
  });

  it('should not contain confusing characters like O, I, 0, 1', () => {
    const confusingChars = ['O', 'I', '0', '1'];

    for (let i = 0; i < 100; i++) {
      const reference = generateBookingReference();

      for (const char of confusingChars) {
        expect(reference).not.toContain(char);
      }
    }
  });
});
