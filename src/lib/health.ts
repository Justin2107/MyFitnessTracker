// Apple Health: read daily steps, weigh-ins and workouts, and merge them into day records.
// Values you type in yourself always win over Apple Health for that day.
import { Platform } from 'react-native';
import {
  isHealthDataAvailableAsync,
  requestAuthorization,
  queryStatisticsCollectionForQuantity,
  queryQuantitySamples,
  queryWorkoutSamples,
  WorkoutActivityType,
} from '@kingstinct/react-native-healthkit';
import { addD, ds, normalizeDay, todayS } from './calc';
import type { Cardio, Docs } from './types';

const READ = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierBodyMass',
  'HKWorkoutTypeIdentifier',
] as const;

export async function healthAvailable() {
  if (Platform.OS !== 'ios') return false;
  try { return await isHealthDataAvailableAsync(); } catch { return false; }
}

export async function connectHealth() {
  if (!(await healthAvailable())) throw new Error('Apple Health is not available on this device.');
  await requestAuthorization({ toRead: READ });
}

const LABELS: Partial<Record<number, string>> = {
  [WorkoutActivityType.running]: 'Run',
  [WorkoutActivityType.walking]: 'Walk',
  [WorkoutActivityType.cycling]: 'Cycling',
  [WorkoutActivityType.rowing]: 'Rowing',
  [WorkoutActivityType.swimming]: 'Swimming',
  [WorkoutActivityType.elliptical]: 'Elliptical',
  [WorkoutActivityType.stairClimbing]: 'Stair climber',
  [WorkoutActivityType.highIntensityIntervalTraining]: 'HIIT',
  [WorkoutActivityType.traditionalStrengthTraining]: 'Strength',
  [WorkoutActivityType.functionalStrengthTraining]: 'Strength',
};
const STRENGTH = new Set<number>([WorkoutActivityType.traditionalStrengthTraining, WorkoutActivityType.functionalStrengthTraining]);

const toKcal = (q?: { quantity: number; unit: string }) => {
  if (!q) return null;
  const u = q.unit.toLowerCase();
  if (u === 'kj') return q.quantity / 4.184;
  if (u === 'j') return q.quantity / 4184;
  return q.quantity; // kcal / Cal
};
const toMinutes = (q?: { quantity: number; unit: string }) => {
  if (!q) return 0;
  const u = q.unit.toLowerCase();
  return u === 'min' ? q.quantity : u === 'hr' ? q.quantity * 60 : q.quantity / 60;
};

/** Returns only the day records that changed. */
export async function syncHealth(docs: Docs, daysBack: number): Promise<Docs> {
  if (!(await healthAvailable())) return {};
  await requestAuthorization({ toRead: READ }); // no prompt after the first time
  const startS = addD(todayS(), -daysBack + 1);
  const start = new Date(startS + 'T00:00:00');
  const end = new Date();
  const filter = { date: { startDate: start, endDate: end } };

  const [stepStats, weights, workouts] = await Promise.all([
    queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], start, { day: 1 }, { filter, unit: 'count' }),
    queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', { limit: 0, ascending: true, unit: 'kg', filter }),
    queryWorkoutSamples({ limit: 0, ascending: true, filter }),
  ]);

  const changes: Docs = {};
  const get = (d: string) => {
    const id = 'd-' + d;
    if (!changes[id]) changes[id] = normalizeDay(JSON.parse(JSON.stringify(docs[id] ?? null)), d);
    return changes[id] as ReturnType<typeof normalizeDay>;
  };
  const touched = new Set<string>();

  for (const r of stepStats) {
    if (!r.startDate || !r.sumQuantity) continue;
    const d = ds(new Date(r.startDate));
    const steps = Math.round(r.sumQuantity.quantity);
    const day = get(d);
    if (day.stepsSource !== 'manual' && day.steps !== steps) {
      day.steps = steps; day.stepsSource = 'health'; touched.add(d);
    }
  }

  // First weigh-in of each day (morning weight).
  const firstOfDay: Record<string, number> = {};
  for (const s of weights) {
    const d = ds(new Date(s.startDate));
    if (firstOfDay[d] == null) firstOfDay[d] = s.quantity;
  }
  for (const [d, kg] of Object.entries(firstOfDay)) {
    const day = get(d);
    const v = Math.round(kg * 100) / 100;
    if (day.weightSource !== 'manual' && day.weight !== v) {
      day.weight = v; day.weightSource = 'health'; touched.add(d);
    }
  }

  for (const w of workouts) {
    const s = w.toJSON();
    const d = ds(new Date(s.startDate));
    const day = get(d);
    const id = 'hk-' + s.uuid;
    if (day.training.cardio.some((c) => c.id === id)) continue;
    const type = s.workoutActivityType;
    const entry: Cardio = {
      id,
      type: (LABELS[type] ?? 'Workout') + ' (Apple Health)',
      minutes: Math.round(toMinutes(s.duration)),
      kcal: (() => { const k = toKcal(s.totalEnergyBurned); return k == null ? null : Math.round(k); })(),
      source: 'health',
      strength: STRENGTH.has(type) || undefined,
    };
    day.training.cardio.push(entry);
    touched.add(d);
  }

  const out: Docs = {};
  for (const d of touched) out['d-' + d] = changes['d-' + d];
  return out;
}
