export const WORLD = { width: 800, height: 608, spawn: { x: 400, y: 520 }, speed: 130 };
export const TABLE_POINTS = [{ x: 248, y: 284 }, { x: 552, y: 284 }];
export const BOARDS = [{ x: 320, y: 108, action: 'goal' }, { x: 480, y: 108, action: 'history' }];
export function seatPoint(table: number, seat: number) {
  const p = TABLE_POINTS[table];
  return { x: p.x + (seat % 2 === 0 ? -42 : 42), y: p.y + (seat < 2 ? -48 : 62), direction: seat < 2 ? 'down' as const : 'up' as const };
}
export const OBSTACLES = [
  ...TABLE_POINTS.map(p => ({ x: p.x - 72, y: p.y - 26, w: 144, h: 62 })),
  { x: 52, y: 78, w: 150, h: 44 }, { x: 598, y: 78, w: 150, h: 44 },
  { x: 66, y: 438, w: 150, h: 46 }, { x: 610, y: 440, w: 110, h: 44 },
  { x: 65, y: 174, w: 34, h: 34 }, { x: 700, y: 174, w: 34, h: 34 },
];
export function walkable(x: number, y: number) {
  return Number.isFinite(x) && Number.isFinite(y) && x >= 38 && x <= 762 && y >= 142 && y <= 558 &&
    !OBSTACLES.some(o => x > o.x - 8 && x < o.x + o.w + 8 && y > o.y - 4 && y < o.y + o.h + 4);
}
