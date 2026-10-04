import { initials } from '@/components/InitialsAvatar';
import { fitWithin, MAX_PHOTO_EDGE } from '@/lib/photoSize';

describe('fitWithin', () => {
  it('scales the longest edge down to 1600 px', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: MAX_PHOTO_EDGE });
    expect(fitWithin(3000, 4000)).toEqual({ height: MAX_PHOTO_EDGE });
    expect(fitWithin(2000, 2000)).toEqual({ width: MAX_PHOTO_EDGE });
  });

  it('leaves small images and bad sizes alone', () => {
    expect(fitWithin(1600, 1200)).toBeNull();
    expect(fitWithin(800, 600)).toBeNull();
    expect(fitWithin(0, 0)).toBeNull();
  });
});

describe('initials', () => {
  it.each([
    ['Aakash Makhija', 'AM'],
    ['anna', 'A'],
    ['  Mary  Ann  Lee ', 'ML'],
    ['', '?'],
  ])('%s → %s', (name, expected) => expect(initials(name)).toBe(expected));
});
