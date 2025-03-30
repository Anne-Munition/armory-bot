import MockDate from 'mockdate';
import { getTodayDate } from '../birthdays.js';

describe('birthdays module', () => {
  describe('getTodayDate method', () => {
    test('runtime', () => {
      MockDate.set(1659355200000); // Monday, August 1, 2022 6:00:00 GMT-06:00
      const actual = getTodayDate();
      expect(actual).toBe('08/01');
    });

    test('start of day', () => {
      MockDate.set(1659312000000); // Monday, August 1, 2022 0:00:00
      const actual = getTodayDate();
      expect(actual).toBe('08/01');
    });

    test('end of day', () => {
      MockDate.set(1659398399000); // Monday, August 1, 2022 23:59:59
      const actual = getTodayDate();
      expect(actual).toBe('08/01');
    });
  });
});
