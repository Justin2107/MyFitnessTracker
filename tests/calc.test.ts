import { test } from 'node:test';
import assert from 'node:assert/strict';
import { model, parseBackup, navyBF, e1rm, addD, todayS } from '../src/lib/calc.ts';

const profile = { units: 'metric', sex: 'm', age: 30, height: 180, startWeight: 85, goal: 'cut', trainDays: 4, typSteps: 9000, targetMode: 'auto', kcalTarget: null, goalWeight: 78 };

function webExport() {
  // Same shape the web tracker's "Export JSON" produces.
  const docs: Record<string, unknown> = { profile };
  for (let i = 30; i >= 0; i--) {
    const d = addD(todayS(), -i);
    docs['d-' + d] = {
      date: d, weight: 85 - (30 - i) * 0.05, steps: 9000,
      foods: [{ id: 'f' + i, name: 'Chicken rice', kcal: 2200, p: 180, c: 200, f: 60, meal: 'Lunch' }],
      training: { minutes: null, lifts: i % 2 ? [{ id: 'l' + i, name: 'Bench Press', sets: [{ kg: 80, reps: 8 }, { kg: 80, reps: 7 }] }] : [], cardio: [] },
      meas: i === 0 ? { waist: 88, neck: 39 } : null, photos: [],
    };
  }
  return JSON.stringify(docs);
}

test('imports a web tracker export', () => {
  const docs = parseBackup(webExport());
  assert.equal(Object.keys(docs).length, 32);
  const m = model(docs);
  assert.equal(m.prof?.goal, 'cut');
  assert.equal(m.days.length, 31);
});

test('rejects files that are not exports', () => {
  assert.throws(() => parseBackup('[1,2,3]'));
  assert.throws(() => parseBackup('{"foo":1}'));
});

test('BMR, burn and targets are sensible', () => {
  const m = model(parseBackup(webExport()));
  const b = m.bmr(m.prof!, 80);
  assert.equal(Math.round(b), 10 * 80 + 6.25 * 180 - 5 * 30 + 5);
  const burn = m.burn(todayS());
  assert.ok(burn.total > 2300 && burn.total < 3300, 'burn ' + burn.total);
  const t = m.targets(todayS());
  assert.ok(t.kcal < t.maint, 'cut target below maintenance');
  assert.ok(t.pro > 150 && t.pro < 200);
});

test('measured maintenance reflects intake and weight change', () => {
  const m = model(parseBackup(webExport()));
  const mm = m.measuredMaintenance();
  assert.ok(mm, 'should compute');
  // Eating 2200 while losing weight means maintenance is above 2200.
  assert.ok(mm!.tdee > 2200, 'tdee ' + mm!.tdee);
  assert.ok(mm!.rate < 0);
});

test('strength workout from Apple Health replaces the set-based estimate', () => {
  const d = todayS();
  const docs = parseBackup(webExport());
  const day = docs['d-' + d] as any;
  day.training.lifts = [{ id: 'x', name: 'Squat', sets: [{ kg: 100, reps: 5 }] }];
  const before = model(docs).burn(d).lift;
  assert.ok(before > 0);
  day.training.cardio = [{ id: 'hk-1', type: 'Strength (Apple Health)', minutes: 60, kcal: 300, source: 'health', strength: true }];
  const after = model(docs).burn(d);
  assert.equal(after.lift, 0);
  assert.equal(after.cardio, 300);
});

test('Epley 1RM and Navy body fat', () => {
  assert.equal(e1rm(100, 1), 100);
  assert.ok(Math.abs(e1rm(100, 10) - 133.33) < 0.01);
  const bf = navyBF(profile as any, { waist: 88, neck: 39 });
  assert.ok(bf! > 12 && bf! < 20, 'bf ' + bf);
});

test('lift history tracks PRs', () => {
  const m = model(parseBackup(webExport()));
  const h = m.liftHistory()['Bench Press'];
  assert.ok(h.sessions.length >= 10);
  assert.ok(Math.abs(h.best - e1rm(80, 8)) < 0.01);
});
