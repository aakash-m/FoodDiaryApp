import { batteryGuidance } from '@/lib/batteryGuidance';

describe('batteryGuidance', () => {
  it.each([
    ['vivo', 'iQOO', 'iQOO / vivo'],
    ['vivo', 'vivo', 'iQOO / vivo'],
    ['samsung', 'samsung', 'Samsung'],
    ['Xiaomi', 'Redmi', 'Xiaomi'],
    ['OnePlus', 'OnePlus', 'OnePlus / OPPO / realme'],
  ])('%s %s → %s', (manufacturer, brand, label) => {
    expect(batteryGuidance(manufacturer, brand)?.brand).toBe(label);
    expect(batteryGuidance(manufacturer, brand)?.steps.length).toBeGreaterThan(0);
  });

  it('shows nothing on stock Android (Pixel) or unknown phones', () => {
    expect(batteryGuidance('Google', 'google')).toBeNull();
    expect(batteryGuidance(null, null)).toBeNull();
  });
});
