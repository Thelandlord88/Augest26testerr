// Stage-aware ordering for neighbors: P1 first, then P2, then the rest
export const P1 = new Set([
  'ipswich','springfield','springfield-lakes','redbank-plains','goodna',
  'yamanto','ripley','raceview','bundamba','booval',
]);
export const P2 = new Set([
  // Fill when ready to unlock more Ipswich spokes
  'brookwater','augustine-heights','camira','bellbird-park','collingwood-park',
  'redbank','riverview','dinmore','north-booval','east-ipswich',
  'silkstone','flinders-view','deebing-heights','newtown','brassall',
  'west-ipswich','woodend','one-mile','sadliers-crossing',
]);

export function prioritiseByGrid(slugs) {
  const p1 = slugs.filter(s => P1.has(s));
  const p2 = slugs.filter(s => P2.has(s) && !P1.has(s));
  const rest = slugs.filter(s => !P1.has(s) && !P2.has(s));
  return [...p1, ...p2, ...rest];
}