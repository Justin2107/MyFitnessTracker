import { View } from 'react-native';
import { Btn, Card, H, Item, Note, Screen, Stat, T } from '@/components/ui';
import { BarChart, EnergyChart, LineChart } from '@/components/charts';
import { NeedsSetup } from '@/components/NeedsSetup';
import { GOALS, addD, diffD, fmt, fmtD, range, sgn, todayS, units } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

export default function Trends() {
  return <NeedsSetup><TrendsInner /></NeedsSetup>;
}

function TrendsInner() {
  const c = useColors();
  const { m, saveProfile } = useStore();
  const p = m.prof!;
  const u = units(p);
  const end = todayS();
  const T_ = m.trend;
  const span = T_.first ? Math.min(Math.max(diffD(T_.first, end) + 1, 14), 120) : 30;
  const dates = range(end, span);
  const wBy = Object.fromEntries(m.days.filter((x) => x.weight).map((x) => [x.date, x.weight as number]));
  const tr = dates.map((d) => (T_.map[d] != null ? u.wOut(T_.map[d]) : null));
  const raw = dates.map((d) => (wBy[d] != null ? u.wOut(wBy[d]) : null));
  const cur = T_.map[end];
  const twoWk = T_.map[addD(end, -14)];
  const wk = cur != null && twoWk != null ? (cur - twoWk) / 2 : null;
  const startW = T_.first ? wBy[T_.first] : null;
  const eta = p.goalWeight && wk && cur && Math.sign(p.goalWeight - cur) === Math.sign(wk) ? Math.ceil(Math.abs(p.goalWeight - cur) / Math.abs(wk)) : null;

  const d28 = range(end, 28);
  const t = m.targets(end);
  const mm = m.measuredMaintenance();
  const logged = d28.filter((d) => m.intake(m.day(d)).kcal > 400);
  const avg = (f: (d: string) => number) => (logged.length ? logged.reduce((a, d) => a + f(d), 0) / logged.length : null);
  const avgIn = avg((d) => m.intake(m.day(d)).kcal);
  const avgOut = avg((d) => m.burn(d).total);
  const avgPro = avg((d) => m.intake(m.day(d)).p);
  const steps = d28.map((d) => m.day(d)?.steps ?? 0);
  const stepDays = steps.filter(Boolean);
  const goalOff = (GOALS[p.goal] ?? GOALS.recomp).off;

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const wd = range(addD(end, -7 * i), 7);
    const L = wd.filter((d) => m.intake(m.day(d)).kcal > 400);
    const st = wd.map((d) => m.day(d)?.steps).filter((v): v is number => !!v);
    return {
      from: wd[0],
      kcal: L.length ? L.reduce((a, d) => a + m.intake(m.day(d)).kcal, 0) / L.length : null,
      pro: L.length ? L.reduce((a, d) => a + m.intake(m.day(d)).p, 0) / L.length : null,
      steps: st.length ? st.reduce((a, b) => a + b, 0) / st.length : null,
      trend: T_.map[wd[6]],
      sessions: wd.filter((d) => m.setsCount(m.day(d)) || (m.day(d)?.training.cardio.length ?? 0)).length,
    };
  });

  return (
    <Screen dateBar={false}>
      <Card>
        <H>Weight</H>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Stat label="Trend weight" value={cur != null ? fmt(u.wOut(cur), 1) : '—'} unit={u.wU} />
          <Stat label="Per week" value={wk != null ? (wk > 0 ? '+' : '') + fmt(u.wOut(wk), 2) : '—'} unit={u.wU} sub={wk != null && cur ? `${fmt((Math.abs(wk) / cur) * 100, 2)}% of bodyweight` : 'needs 2 weeks'} />
          <Stat label="Since start" value={cur != null && startW ? (cur - startW > 0 ? '+' : '') + fmt(u.wOut(cur - startW), 1) : '—'} unit={u.wU} />
          <Stat label="Goal" value={p.goalWeight ? fmt(u.wOut(p.goalWeight), 1) : '—'} unit={p.goalWeight ? u.wU : undefined} sub={eta ? `≈ ${eta} weeks at this rate` : p.goalWeight ? '—' : 'Not set'} />
        </View>
        <LineChart dates={dates} raw={raw} trend={tr} yfmt={(v) => fmt(v, 1)} goal={p.goalWeight ? u.wOut(p.goalWeight) : null} />
        <Note>Dots are scale weigh-ins; the line is the trend, which smooths out day-to-day water weight changes.</Note>
      </Card>

      <Card>
        <H>Calories, last 28 days</H>
        <EnergyChart dates={d28} m={m} target={t.kcal} />
        <T muted size={12}>Bars: eaten (orange if more than burned). Black line: burned. Dashed: target.</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Stat label="Avg eaten" value={fmt(avgIn)} />
          <Stat label="Avg burned" value={fmt(avgOut)} />
          <Stat label="Avg net" value={avgIn != null && avgOut != null ? sgn(avgIn - avgOut) : '—'} />
          <Stat label="Avg protein" value={fmt(avgPro)} unit="g" />
        </View>
        <T muted size={13}>{logged.length} of 28 days logged.</T>
      </Card>

      <Card>
        <H>Maintenance calories</H>
        {mm ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Stat label="From your data" value={fmt(mm.tdee)} unit="kcal" />
              <Stat label="Formula estimate" value={fmt(t.maint)} unit="kcal" />
            </View>
            <T size={14}>Based on {mm.days} logged days: you averaged {fmt(mm.avg)} kcal while your trend moved {mm.rate > 0 ? '+' : ''}{fmt(u.wOut(mm.rate), 2)} {u.wU}/week.</T>
            <Btn kind="primary" title={`Set target to ${fmt(Math.round((mm.tdee + goalOff) / 10) * 10)} kcal`}
              onPress={() => saveProfile({ ...p, targetMode: 'manual', kcalTarget: Math.round((mm.tdee + goalOff) / 10) * 10 })} />
          </>
        ) : (
          <>
            <T muted size={14}>Log food and weight on most days for two weeks to calculate this from your own data.</T>
            <Stat label="Formula estimate" value={fmt(t.maint)} unit="kcal" />
          </>
        )}
      </Card>

      <Card>
        <H right={<T muted size={14}>avg {stepDays.length ? fmt(stepDays.reduce((a, b) => a + b, 0) / stepDays.length) : '—'}</T>}>Steps</H>
        <BarChart dates={d28} vals={steps} goal={p.typSteps || 10000} />
      </Card>

      <Card>
        <H>Weekly summary</H>
        {weeks.map((w) => (
          <Item key={w.from} title={`Week of ${fmtD(w.from, { day: 'numeric', month: 'short' })}`}
            meta={`${fmt(w.kcal)} kcal · ${w.pro != null ? fmt(w.pro) + ' g protein' : '— protein'} · ${fmt(w.steps)} steps · ${w.sessions} sessions`}
            right={w.trend != null ? `${fmt(u.wOut(w.trend), 1)} ${u.wU}` : '—'} />
        ))}
      </Card>
      <View style={{ height: 1, backgroundColor: c.bg }} />
    </Screen>
  );
}
