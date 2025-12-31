import { normalizeCity } from './normalizeCity';

describe('normalizeCity', () => {
  it('should normalize Vietnamese city names with diacritics', () => {
    expect(normalizeCity('Hà Nội')).toBe('ha noi');
    expect(normalizeCity('Đà Nẵng')).toBe('da nang');
    expect(normalizeCity('Hồ Chí Minh')).toBe('ho chi minh');
    expect(normalizeCity('Cần Thơ')).toBe('can tho');
    expect(normalizeCity('Huế')).toBe('hue');
  });

  it('should convert to lowercase', () => {
    expect(normalizeCity('HÀ NỘI')).toBe('ha noi');
    expect(normalizeCity('Hà Nội')).toBe('ha noi');
    expect(normalizeCity('hà nội')).toBe('ha noi');
  });

  it('should handle special Vietnamese characters', () => {
    expect(normalizeCity('Đồng Nai')).toBe('dong nai');
    expect(normalizeCity('Điện Biên')).toBe('dien bien');
    expect(normalizeCity('Đắk Lắk')).toBe('dak lak');
  });

  it('should normalize multiple spaces to single space', () => {
    expect(normalizeCity('Hà   Nội')).toBe('ha noi');
    expect(normalizeCity('Hồ  Chí   Minh')).toBe('ho chi minh');
  });

  it('should trim leading and trailing spaces', () => {
    expect(normalizeCity('  Hà Nội  ')).toBe('ha noi');
    expect(normalizeCity('Đà Nẵng   ')).toBe('da nang');
    expect(normalizeCity('   Cần Thơ')).toBe('can tho');
  });

  it('should handle empty or null strings', () => {
    expect(normalizeCity('')).toBe('');
    expect(normalizeCity(null as any)).toBe('');
    expect(normalizeCity(undefined as any)).toBe('');
  });

  it('should handle strings without diacritics', () => {
    expect(normalizeCity('Hanoi')).toBe('hanoi');
    expect(normalizeCity('Da Nang')).toBe('da nang');
    expect(normalizeCity('Ho Chi Minh')).toBe('ho chi minh');
  });

  it('should make comparisons case-insensitive and diacritic-insensitive', () => {
    const normalized1 = normalizeCity('Hà Nội');
    const normalized2 = normalizeCity('ha noi');
    const normalized3 = normalizeCity('HÀ NỘI');
    const normalized4 = normalizeCity('Ha Noi');

    expect(normalized1).toBe(normalized2);
    expect(normalized2).toBe(normalized3);
    expect(normalized3).toBe(normalized4);
  });

  it('should handle city names with numbers', () => {
    expect(normalizeCity('Biên Hòa 2')).toBe('bien hoa 2');
    expect(normalizeCity('Đà Lạt 1')).toBe('da lat 1');
  });

  it('should handle city names with special characters', () => {
    expect(normalizeCity('Tây Ninh')).toBe('tay ninh');
    expect(normalizeCity('Bà Rịa - Vũng Tàu')).toBe('ba ria - vung tau');
  });
});
