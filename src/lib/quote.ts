import h from 'haversine-distance';

export function quote({ base, depot, to, flags }: any) {
  const km = h(depot, to) / 1000;
  const travel = km < 10 ? 0 : km < 25 ? 10 : 25;
  const parking = flags?.parkingHard ? 15 : 0;
  const band = base + travel + parking;
  return { min: band - 20, max: band + 20, km };
}
