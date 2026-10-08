// Data model. Matches the JSON exported by the web version of the tracker,
// so an export from there can be imported here unchanged.

export type GoalKey = 'cut_hard' | 'cut' | 'recomp' | 'maintain' | 'lean_bulk' | 'bulk';
export type MeasKey = 'waist' | 'neck' | 'chest' | 'shoulders' | 'arm' | 'thigh' | 'hips' | 'bf';

export type Food = {
  id: string;
  name: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  meal?: string;
  at?: number;
  src?: string;
};

export type LiftSet = { kg: number; reps: number };
export type Lift = { id: string; name: string; sets: LiftSet[] };

export type Cardio = {
  id: string;
  type: string;
  minutes: number;
  kcal: number | null;
  /** Imported from Apple Health. */
  source?: 'health';
  /** An Apple Health strength workout. Its calories replace the set-based estimate for that day. */
  strength?: boolean;
};

export type Photo = { id: string; pose: string; at?: number };

export type Day = {
  date: string; // YYYY-MM-DD, local time
  foods: Food[];
  steps: number | null;
  stepsSource?: 'health' | 'manual';
  weight: number | null; // kg
  weightSource?: 'health' | 'manual';
  training: { minutes: number | null; lifts: Lift[]; cardio: Cardio[] };
  meas: Partial<Record<MeasKey, number>> | null; // cm, bf in %
  photos: Photo[];
};

export type Profile = {
  units: 'metric' | 'imperial';
  sex: 'm' | 'f';
  age: number;
  height: number; // cm
  startWeight: number | null; // kg
  startDate?: string;
  goal: GoalKey;
  trainDays: number;
  typSteps: number;
  targetMode: 'auto' | 'manual';
  kcalTarget: number | null;
  goalWeight: number | null; // kg
  healthSync?: boolean;
  aiModel?: string;
};

/** All stored records: "profile" plus one "d-YYYY-MM-DD" per day. */
export type Docs = Record<string, unknown>;
