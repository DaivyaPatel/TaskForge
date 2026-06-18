export const hexToRgb = (hex) => {
  if (!hex) return '15, 23, 42'; // Default slate-950

  // Remove the hash if it exists
  hex = hex.replace(/^#/, '');

  // Parse r, g, b values
  let r = parseInt(hex.length === 3 ? hex.slice(0, 1).repeat(2) : hex.slice(0, 2), 16);
  let g = parseInt(hex.length === 3 ? hex.slice(1, 2).repeat(2) : hex.slice(2, 4), 16);
  let b = parseInt(hex.length === 3 ? hex.slice(2, 3).repeat(2) : hex.slice(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return '15, 23, 42';

  return `${r}, ${g}, ${b}`;
};