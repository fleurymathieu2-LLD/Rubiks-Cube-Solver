import type { Color } from './cube';

export const COLOR_NAME: Record<Color, string> = {
  white: 'White',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  red: 'Red',
  orange: 'Orange',
};

export const colorName = (c: Color) => COLOR_NAME[c];
