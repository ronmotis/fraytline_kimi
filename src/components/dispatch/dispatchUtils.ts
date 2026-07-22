// Dispatch page utilities — week helpers, gantt bar derivation, compatibility verdict engine.
import type { Driver, FleetUnit, Movement, MovementStatus } from '@/store';

/** Demo planning week (dispatch.md: Mon 19 — Sun 25 May). Today = Wed 21. */
export const WEEK_DAYS = ['Mon 19', 'Tue 20', 'Wed 21', 'Thu 22', 'Fri 23', 'Sat 24', 'Sun 25'];
export const TODAY_IDX = 2; // Wed 21 May

const DAY_IDX: Record<string, number> = {
  mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
};

export function dayIdxFromLabel(time: string): number | null {
  const m = time.toLowerCase().match(/\b(mon|tue|wed|thu|fri|sat|sun)\b/);
  return m ? DAY_IDX[m[1]] : null;
}

export interface GanttBar {
  key: string;
  movementId?: string;
  label: string;
  startIdx: number;
  endIdx: number;
  tone: MovementStatus | 'service' | 'proposed';
  tooltip: string;
}

/** Booking bars for one vehicle row, derived from real movements + service windows. */
export function barsForVehicle(vehicle: FleetUnit, movements: Movement[], proposed?: Movement): GanttBar[] {
  const bars: GanttBar[] = [];
  for (const m of movements) {
    if (m.vehiclePlate !== vehicle.plate) continue;
    const days = m.milestones.map((ms) => dayIdxFromLabel(ms.time)).filter((d): d is number => d !== null);
    if (days.length === 0) continue;
    const start = Math.max(0, Math.min(...days));
    const end = Math.max(0, Math.max(...days));
    bars.push({
      key: `${vehicle.id}-${m.id}`,
      movementId: m.id,
      label: m.id,
      startIdx: start,
      endIdx: end,
      tone: m.status,
      tooltip: `${m.id} · ${m.from} → ${m.to} · ${m.driverName ?? 'unassigned'} · ${m.status}`,
    });
  }
  if (proposed && !proposed.vehiclePlate) {
    const days = proposed.milestones.map((ms) => dayIdxFromLabel(ms.time)).filter((d): d is number => d !== null);
    if (days.length > 0) {
      bars.push({
        key: `${vehicle.id}-proposed-${proposed.id}`,
        movementId: proposed.id,
        label: `${proposed.id} ?`,
        startIdx: Math.max(0, Math.min(...days)),
        endIdx: Math.max(0, Math.max(...days)),
        tone: 'proposed',
        tooltip: `${proposed.id} · proposed — awaiting approval`,
      });
    }
  }
  if (vehicle.serviceDueDays !== undefined) {
    const idx = Math.min(6, TODAY_IDX + vehicle.serviceDueDays);
    bars.push({
      key: `${vehicle.id}-service`,
      label: 'service',
      startIdx: idx,
      endIdx: idx,
      tone: 'service',
      tooltip: `${vehicle.plate} · service due in ${vehicle.serviceDueDays}d`,
    });
  }
  return bars;
}

/** Week utilization 0..1 — booked days (incl. proposed) over 7. */
export function utilization(bars: GanttBar[]): number {
  const booked = bars
    .filter((b) => b.tone !== 'service')
    .reduce((sum, b) => sum + (b.endIdx - b.startIdx + 1), 0);
  return Math.min(1, booked / 7);
}

// ---------- compatibility verdict engine ----------

export interface VerdictFix {
  label: string;
  kind: 'swap' | 'service';
  vehicleId?: string;
}

export interface Verdict {
  ok: boolean;
  reasons: string[];
  blockers: string[];
  fixes: VerdictFix[];
}

/**
 * Reasoned assignment (dispatch.md §4): dragging a movement onto a truck yields
 * reasons — or blockers with fixes — derived from fleet/driver/movement state.
 */
export function checkCompatibility(
  movement: Movement,
  vehicle: FleetUnit,
  driver: Driver | undefined,
  fleet: FleetUnit[],
): Verdict {
  const crosses = movement.borders.length > 0;
  const pickup = movement.pickupIn ? ` · pickup in ${movement.pickupIn}` : '';
  const reasons: string[] = [];
  const blockers: string[] = [];
  const fixes: VerdictFix[] = [];

  const bestAlt = fleet.find(
    (v) => v.id !== vehicle.id && v.tenantId === vehicle.tenantId && v.status === 'available' && v.driverId,
  );

  if (vehicle.status === 'service-due') {
    blockers.push(`service due in ${vehicle.serviceDueDays ?? 2}d — movement spans the window`);
    if (bestAlt) fixes.push({ label: `Assign ${bestAlt.plate} instead`, kind: 'swap', vehicleId: bestAlt.id });
    fixes.push({ label: 'Move service +2 days (cost $90 — approve?)', kind: 'service' });
  }

  const vehicleCity = vehicle.location.toLowerCase();
  const pickupCity = movement.from.toLowerCase();
  const sameArea = vehicleCity.includes(pickupCity) || pickupCity.includes(vehicleCity.split(' ')[0]);
  if (vehicle.status === 'yard' && !sameArea) {
    blockers.push(`in ${vehicle.location} — reposition misses the ${movement.from} pickup${pickup}`);
    if (bestAlt && !fixes.some((f) => f.vehicleId === bestAlt.id)) {
      fixes.push({ label: `Assign ${bestAlt.plate} instead`, kind: 'swap', vehicleId: bestAlt.id });
    }
  }

  if (!driver && vehicle.status !== 'available') {
    blockers.push('no driver assigned to this unit');
  }
  if (driver && driver.hoursLeft < 4) {
    blockers.push(`driver hours exhausted (${driver.hoursLeft}h left — relief required)`);
  }

  if (blockers.length > 0) return { ok: false, reasons, blockers, fixes };

  // compatible — build the reasoning trace
  if (driver) reasons.push(`driver hours ✓ (${driver.hoursLeft}h left · ${driver.name})`);
  else reasons.push('pool driver required — Kofi available ◈');
  reasons.push(crosses ? 'COMESA ✓ · border dossier ready' : 'docs ✓ · local run');

  if (vehicle.status === 'en-route') {
    reasons.push(`finishes current leg near ${movement.from} Wed 14:30 ✓ · pickup ${movement.milestones[0]?.time ?? 'Thu 05:30'}`);
    reasons.push('deadhead 12 km ◈ · returns empty otherwise — fills the backhaul');
  } else if (vehicle.status === 'available') {
    reasons.push(`available ${vehicle.availableAt ?? 'now'} ✓ · staged at ${vehicle.location}`);
  } else {
    reasons.push(`staged at ${vehicle.location} ✓`);
  }

  if (crosses && movement.borders[0]?.avgHours !== undefined) {
    reasons.push(`${movement.borders[0].name} averaging ${movement.borders[0].avgHours}h ◈ — planned into ETA`);
  }
  return { ok: true, reasons, blockers, fixes };
}

/** Unassigned queue: booked/quoted movements with no vehicle yet. */
export function isUnassigned(m: Movement): boolean {
  return !m.vehiclePlate && (m.status === 'Booked' || m.status === 'Quoted');
}
