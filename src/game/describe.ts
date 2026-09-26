import { WORLD, type Level, type Vec } from './physics';

/** "top left", "center", "bottom", … for a point in the world. */
export function placeName({ x, y }: Vec): string {
  const column = x < WORLD.width / 3 ? 'left' : x > (WORLD.width * 2) / 3 ? 'right' : '';
  const row = y < WORLD.height / 3 ? 'top' : y > (WORLD.height * 2) / 3 ? 'bottom' : '';
  return [row, column].filter(Boolean).join(' ') || 'center';
}

const counted = (count: number, one: string, many: string) =>
  count === 0 ? null : `${count === 1 ? 'one' : count} ${count === 1 ? one : many}`;

/** The canvas's text alternative: what's on the field and where. */
export function describeLevel(level: Level, index: number): string {
  const kinds = (kind: string) => level.bodies.filter((body) => body.kind === kind).length;
  const things = [
    counted(kinds('planet'), 'planet', 'planets'),
    counted(kinds('moon'), 'orbiting moon', 'orbiting moons'),
    counted(kinds('hole'), 'black hole', 'black holes'),
  ].filter(Boolean);
  const beacons = level.beacons?.length ?? 0;
  return [
    `Level ${index + 1}, ${level.name}.`,
    `The probe starts at the ${placeName(level.launch)}; the goal is at the ${placeName(level.goal)}.`,
    things.length > 0 ? `In between: ${things.join(', ')}.` : '',
    beacons > 0
      ? `Collect ${beacons === 1 ? 'the beacon' : beacons === 2 ? 'both beacons' : `all ${beacons} beacons`} first (${(level.beacons ?? []).map(placeName).join(' and ')}).`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
}
