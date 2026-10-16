import type { MultiPolygon, Polygon, Position } from "geojson";

/**
 * Douglas–Peucker line simplification on lon/lat rings.
 *
 * FDW boundaries are published at full cartographic resolution (hundreds of
 * thousands of vertices per country), far more than a WebGL globe needs.
 * Rings are simplified independently, so shared borders may diverge by up to
 * the tolerance; at globe scale this is not visible.
 */

const COORDINATE_DECIMALS = 4;

function perpendicularDistanceSquared(point: Position, start: Position, end: Position): number {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) {
    const ex = point[0] - start[0];
    const ey = point[1] - start[1];
    return ex * ex + ey * ey;
  }
  const t = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  const px = start[0] + clamped * dx - point[0];
  const py = start[1] + clamped * dy - point[1];
  return px * px + py * py;
}

export function simplifyLine(points: Position[], tolerance: number): Position[] {
  if (points.length <= 2) return points;
  const toleranceSquared = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop() as [number, number];
    let maxDistance = 0;
    let index = -1;
    for (let i = first + 1; i < last; i += 1) {
      const distance = perpendicularDistanceSquared(points[i], points[first], points[last]);
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }
    if (index !== -1 && maxDistance > toleranceSquared) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }

  const result: Position[] = [];
  for (let i = 0; i < points.length; i += 1) {
    if (keep[i]) result.push(points[i]);
  }
  return result;
}

function roundPosition(position: Position): Position {
  const factor = 10 ** COORDINATE_DECIMALS;
  return [Math.round(position[0] * factor) / factor, Math.round(position[1] * factor) / factor];
}

/** Simplifies a closed ring; returns null when it collapses below a valid polygon. */
function simplifyRing(ring: Position[], tolerance: number): Position[] | null {
  const simplified = simplifyLine(ring, tolerance).map(roundPosition);
  const first = simplified[0];
  const last = simplified[simplified.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    simplified.push([first[0], first[1]]);
  }
  return simplified.length >= 4 ? simplified : null;
}

function simplifyPolygonRings(rings: Position[][], tolerance: number): Position[][] | null {
  const [outer, ...holes] = rings;
  if (!outer) return null;
  const simplifiedOuter = simplifyRing(outer, tolerance);
  if (!simplifiedOuter) return null;
  const simplifiedHoles = holes
    .map((hole) => simplifyRing(hole, tolerance))
    .filter((hole): hole is Position[] => hole !== null);
  return [simplifiedOuter, ...simplifiedHoles];
}

export function simplifyPolygonGeometry(
  geometry: Polygon | MultiPolygon,
  tolerance: number,
): Polygon | MultiPolygon | null {
  if (geometry.type === "Polygon") {
    const rings = simplifyPolygonRings(geometry.coordinates, tolerance);
    return rings ? { type: "Polygon", coordinates: rings } : null;
  }
  const polygons = geometry.coordinates
    .map((rings) => simplifyPolygonRings(rings, tolerance))
    .filter((rings): rings is Position[][] => rings !== null);
  if (polygons.length === 0) return null;
  if (polygons.length === 1) return { type: "Polygon", coordinates: polygons[0] };
  return { type: "MultiPolygon", coordinates: polygons };
}

export function countVertices(geometry: Polygon | MultiPolygon): number {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.reduce((sum, ring) => sum + ring.length, 0);
  }
  return geometry.coordinates.reduce(
    (sum, rings) => sum + rings.reduce((inner, ring) => inner + ring.length, 0),
    0,
  );
}

export function extendBbox(
  bbox: [number, number, number, number] | null,
  geometry: Polygon | MultiPolygon,
): [number, number, number, number] {
  let [west, south, east, north] = bbox ?? [Infinity, Infinity, -Infinity, -Infinity];
  const visit = (position: Position) => {
    west = Math.min(west, position[0]);
    east = Math.max(east, position[0]);
    south = Math.min(south, position[1]);
    north = Math.max(north, position[1]);
  };
  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((ring) => ring.forEach(visit));
  } else {
    geometry.coordinates.forEach((rings) => rings.forEach((ring) => ring.forEach(visit)));
  }
  return [west, south, east, north];
}
