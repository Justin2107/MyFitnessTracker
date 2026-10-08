// All the maths. Pure functions with no React Native imports, so they can be unit tested in Node.
import type { Cardio, Day, Docs, GoalKey, MeasKey, Profile } from './types';

/* ---------- dates (local time) ---------- */
const pad = (n: number) => String(n).padStart(2, '0');
export const ds = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayS = () => ds(new Date());
export const parseD = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addD = (s: string, n: number) => {
  const d = parseD(s);
  d.setDate(d.getDate() + n);
  return ds(d);
};
export const diffD = (a: string, b: string) => Math.round((parseD(b).getTime() - parseD(a).getTime()) / 864e5);
export const range = (end: string, n: number) => Array.from({ length: n }, (_, i) => addD(end, i - n + 1));
export const fmtD = (s: string, o: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  parseD(s).toLocaleDateString(undefined, o);

/* ---------- numbers ---------- */
export const fmt = (n: number | null | undefined, d = 0) =>
  n == null || Number.isNaN(n)
    ? '—'
    : Number(n).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
export const sgn = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
export const num = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
};
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const nid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

/* ---------- reference tables ---------- */
export const EXERCISES = ['Bench Press', 'Back Squat', 'Deadlift', 'Overhead Press', 'Barbell Row', 'Pull-up', 'Chin-up', 'Incline Dumbbell Press', 'Romanian Deadlift', 'Front Squat', 'Leg Press', 'Lat Pulldown', 'Seated Cable Row', 'Dumbbell Lateral Raise', 'Barbell Curl', 'Dumbbell Curl', 'Triceps Pushdown', 'Skull Crusher', 'Hip Thrust', 'Bulgarian Split Squat', 'Leg Curl', 'Leg Extension', 'Standing Calf Raise', 'Dips', 'Face Pull', 'Cable Fly', 'Hammer Curl', 'Shrug'];
/** Net METs (MET − 1), since resting burn is already counted in BMR. */
export const CARDIO: Record<string, number> = { 'Walk (brisk)': 3.3, 'Incline walk': 5, Run: 8.8, Cycling: 6.5, Rowing: 6, Swimming: 6, Elliptical: 4, 'Stair climber': 8, HIIT: 7, Sports: 6 };
export const LIFT_NET_MET = 4;
export const GOALS: Record<GoalKey, { label: string; off: number; pro: number }> = {
  cut_hard: { label: 'Aggressive cut', off: -750, pro: 2.4 },
  cut: { label: 'Cut', off: -500, pro: 2.2 },
  recomp: { label: 'Recomp', off: -200, pro: 2.2 },
  maintain: { label: 'Maintain', off: 0, pro: 1.8 },
  lean_bulk: { label: 'Lean bulk', off: 250, pro: 1.8 },
  bulk: { label: 'Bulk', off: 450, pro: 1.8 },
};
export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const;
export const MEAS: [MeasKey, string][] = [['waist', 'Waist'], ['neck', 'Neck'], ['chest', 'Chest'], ['shoulders', 'Shoulders'], ['arm', 'Arm (flexed)'], ['thigh', 'Thigh'], ['hips', 'Hips'], ['bf', 'Body fat % (measured)']];

export const defaultMeal = (now = new Date()) => {
  const h = now.getHours() + now.getMinutes() / 60;
  return h < 10.5 ? 'Breakfast' : h < 15 ? 'Lunch' : h < 20.5 ? 'Dinner' : 'Snacks';
};

export const blankDay = (d: string): Day => ({
  date: d, foods: [], steps: null, weight: null,
  training: { minutes: null, lifts: [], cardio: [] }, meas: null, photos: [],
});

/** Fill in missing fields so older or imported records are safe to read. */
export function normalizeDay(raw: unknown, date: string): Day {
  const x = (raw && typeof raw === 'object' ? raw : {}) as Partial<Day>;
  return {
    ...blankDay(date),
    ...x,
    date,
    foods: Array.isArray(x.foods) ? x.foods : [],
    photos: Array.isArray(x.photos) ? x.photos : [],
    training: {
      minutes: x.training?.minutes ?? null,
      lifts: Array.isArray(x.training?.lifts) ? x.training!.lifts : [],
      cardio: Array.isArray(x.training?.cardio) ? x.training!.cardio : [],
    },
  };
}

/* ---------- unit conversion ---------- */
export const units = (p: Profile | null) => {
  const imp = p?.units === 'imperial';
  return {
    imp,
    wU: imp ? 'lb' : 'kg',
    lU: imp ? 'in' : 'cm',
    wOut: (kg: number | null | undefined) => (kg == null ? null : imp ? kg * 2.20462 : kg),
    wIn: (v: number | null) => (v == null ? null : imp ? v / 2.20462 : v),
    lOut: (cm: number | null | undefined) => (cm == null ? null : imp ? cm / 2.54 : cm),
    lIn: (v: number | null) => (v == null ? null : imp ? v * 2.54 : v),
  };
};

/* ---------- the model: everything derived from stored records ---------- */
export function model(docs: Docs) {
  const prof = (docs.profile as Profile | undefined) ?? null;
  const dayKeys = Object.keys(docs).filter((k) => k.startsWith('d-')).sort();
  const days: Day[] = dayKeys.map((k) => normalizeDay(docs[k], k.slice(2)));
  const byDate: Record<string, Day> = Object.fromEntries(days.map((d) => [d.date, d]));
  const day = (d: string): Day | null => byDate[d] ?? null;

  const weightOn = (d: string) => {
    let w: number | null = null;
    for (const x of days) {
      if (x.date > d) break;
      if (x.weight) w = x.weight;
    }
    return w ?? prof?.startWeight ?? 75;
  };
  const bmr = (p: Profile, w: number) => 10 * w + 6.25 * p.height - 5 * p.age + (p.sex === 'm' ? 5 : -161);
  const intake = (x: Day | null) => {
    const t = { kcal: 0, p: 0, c: 0, f: 0 };
    for (const f of x?.foods ?? []) {
      t.kcal += +f.kcal || 0; t.p += +f.p || 0; t.c += +f.c || 0; t.f += +f.f || 0;
    }
    return t;
  };
  const setsCount = (x: Day | null) => (x?.training.lifts ?? []).reduce((a, l) => a + (l.sets?.length ?? 0), 0);
  const cardioKcal = (c: Cardio, w: number) => (c.kcal != null ? +c.kcal : (CARDIO[c.type] ?? 5) * w * (c.minutes || 0) / 60);
  const liftKcal = (x: Day | null, w: number) => {
    if (!x) return 0;
    if (x.training.cardio.some((c) => c.strength)) return 0; // watch already measured the session
    const n = setsCount(x);
    if (!n) return 0;
    const min = x.training.minutes || n * 3;
    return LIFT_NET_MET * w * min / 60;
  };
  const burn = (d: string) => {
    const p = prof!;
    const x = day(d);
    const w = weightOn(d);
    const b = bmr(p, w);
    const life = b * 0.1;
    const stepK = (x?.steps ?? 0) * 0.0005 * w;
    const lift = liftKcal(x, w);
    const cardio = (x?.training.cardio ?? []).reduce((a, c) => a + cardioKcal(c, w), 0);
    const tef = intake(x).kcal * 0.1;
    return { bmr: b, life, stepK, lift, cardio, train: lift + cardio, tef, total: b + life + stepK + lift + cardio + tef, w };
  };
  const maintenanceModel = (p: Profile, w: number) => {
    const b = bmr(p, w);
    const steps = (p.typSteps ?? 8000) * 0.0005 * w;
    const train = (p.trainDays ?? 4) * LIFT_NET_MET * w / 7;
    return (b * 1.1 + steps + train) / 0.9;
  };
  const targets = (d: string) => {
    const p = prof!;
    const w = weightOn(d);
    const g = GOALS[p.goal] ?? GOALS.recomp;
    const maint = maintenanceModel(p, w);
    const auto = Math.round((maint + g.off) / 10) * 10;
    const kcal = p.targetMode === 'manual' && p.kcalTarget ? p.kcalTarget : auto;
    const pro = Math.round(g.pro * w);
    const fat = Math.round(0.8 * w);
    const carb = Math.max(0, Math.round((kcal - pro * 4 - fat * 9) / 4));
    return { kcal, auto, pro, fat, carb, maint };
  };
  /** Exponential average of scale weight (10% per day) to smooth out water swings. */
  const trend = (() => {
    const ws = days.filter((x) => x.weight);
    const map: Record<string, number> = {};
    if (!ws.length) return { map, first: null as string | null, last: null as string | null };
    const wByDate = Object.fromEntries(ws.map((x) => [x.date, x.weight as number]));
    let t = ws[0].weight as number;
    const last = ws[ws.length - 1].date;
    const end = todayS() > last ? todayS() : last;
    for (let d = ws[0].date; d <= end; d = addD(d, 1)) {
      if (wByDate[d] != null) t = t + 0.1 * (wByDate[d] - t);
      map[d] = t;
    }
    return { map, first: ws[0].date, last: end };
  })();
  /** Average intake corrected for how the trend moved (7,700 kcal ≈ 1 kg). */
  const measuredMaintenance = (end = todayS()) => {
    if (!trend.first) return null;
    const start = addD(end, -27);
    const s = trend.map[start] != null ? start : trend.first > start ? trend.first : null;
    if (!s) return null;
    const span = diffD(s, end);
    if (span < 10) return null;
    let tot = 0, n = 0;
    for (let d = s; d <= end; d = addD(d, 1)) {
      const k = intake(day(d)).kcal;
      if (k > 400) { tot += k; n++; }
    }
    const weighIns = days.filter((x) => x.weight && x.date >= s).length;
    if (n < Math.min(10, span * 0.6) || weighIns < 4) return null;
    const avg = tot / n;
    const endT = trend.map[end] ?? trend.map[trend.last!];
    const dW = endT - trend.map[s];
    return { tdee: avg - (dW * 7700) / span, avg, days: n, span, rate: (dW / span) * 7 };
  };
  const latestMeas = () => {
    const m: Partial<Record<MeasKey, number>> = {};
    for (const x of days) if (x.meas) for (const [k] of MEAS) if (x.meas[k] != null) m[k] = x.meas[k];
    return m;
  };
  const liftHistory = () => {
    type Sess = { date: string; best: number; top: number; vol: number; sets: { kg: number; reps: number }[] };
    const H: Record<string, { name: string; sessions: Sess[]; best: number; top: number; last: Sess }> = {};
    for (const x of days)
      for (const l of x.training.lifts) {
        const k = l.name.trim();
        if (!k) continue;
        const h = (H[k] ??= { name: k, sessions: [], best: 0, top: 0, last: null as unknown as Sess });
        let best = 0, top = 0, vol = 0;
        for (const s of l.sets ?? []) {
          const kg = +s.kg || 0, r = +s.reps || 0;
          best = Math.max(best, e1rm(kg, r)); top = Math.max(top, kg); vol += kg * r;
        }
        h.sessions.push({ date: x.date, best, top, vol, sets: l.sets });
      }
    for (const h of Object.values(H)) {
      h.best = Math.max(...h.sessions.map((s) => s.best));
      h.top = Math.max(...h.sessions.map((s) => s.top));
      h.last = h.sessions[h.sessions.length - 1];
    }
    return H;
  };
  const recentFoods = () => {
    const m: Record<string, { f: Day['foods'][number]; n: number }> = {};
    const from = addD(todayS(), -45);
    for (const x of days) {
      if (x.date < from) continue;
      for (const f of x.foods) {
        const k = f.name.toLowerCase().trim();
        m[k] ??= { f, n: 0 };
        m[k].n++; m[k].f = f;
      }
    }
    return Object.values(m).sort((a, b) => b.n - a.n).slice(0, 14).map((o) => o.f);
  };

  return { prof, days, day, weightOn, bmr, intake, setsCount, cardioKcal, liftKcal, burn, maintenanceModel, targets, trend, measuredMaintenance, latestMeas, liftHistory, recentFoods };
}
export type Model = ReturnType<typeof model>;

export const e1rm = (kg: number, reps: number) => (reps <= 0 ? 0 : reps === 1 ? kg : kg * (1 + Math.min(reps, 12) / 30));

export function navyBF(p: Profile, m: Partial<Record<MeasKey, number>> | null) {
  if (!m || !m.waist || !m.neck || !p.height) return null;
  if (p.sex === 'm') {
    if (m.waist - m.neck <= 0) return null;
    return 495 / (1.0324 - 0.19077 * Math.log10(m.waist - m.neck) + 0.15456 * Math.log10(p.height)) - 450;
  }
  if (!m.hips) return null;
  const v = m.waist + m.hips - m.neck;
  if (v <= 0) return null;
  return 495 / (1.29579 - 0.35004 * Math.log10(v) + 0.221 * Math.log10(p.height)) - 450;
}

/** Parse a JSON export from the web tracker (or this app) into records. */
export function parseBackup(text: string): Docs {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('This file is not a tracker export.');
  const docs = (data.docs && typeof data.docs === 'object' ? data.docs : data) as Record<string, unknown>;
  const out: Docs = {};
  for (const [k, v] of Object.entries(docs)) {
    if (k === 'profile' && v && typeof v === 'object') out.profile = v;
    else if (/^d-\d{4}-\d{2}-\d{2}$/.test(k)) out[k] = normalizeDay(v, k.slice(2));
  }
  if (!Object.keys(out).length) throw new Error('No tracker data found in this file.');
  return out;
}
