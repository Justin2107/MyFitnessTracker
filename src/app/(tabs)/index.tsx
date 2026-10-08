import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Card, Field, H, Item, Meter, Note, Row, Screen, T } from '@/components/ui';
import { NeedsSetup } from '@/components/NeedsSetup';
import { GOALS, fmt, num, sgn, todayS, units } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

export default function Today() {
  return <NeedsSetup><TodayInner /></NeedsSetup>;
}

function TodayInner() {
  const c = useColors();
  const { m, date, editDay } = useStore();
  const p = m.prof!;
  const u = units(p);
  const x = m.day(date);
  const I = m.intake(x);
  const B = m.burn(date);
  const t = m.targets(date);
  const net = I.kcal - B.total;
  const left = t.kcal - I.kcal;
  const isToday = date === todayS();

  const [w, setW] = useState('');
  const [steps, setSteps] = useState('');
  useEffect(() => {
    setW(x?.weight ? fmt(u.wOut(x.weight), 1).replace(/,/g, '') : '');
    setSteps(x?.steps != null ? String(x.steps) : '');
  }, [date, x?.weight, x?.steps, u.imp]);

  const parts: [string, number, string][] = [
    ['Resting (BMR)', B.bmr, c.muted], ['Daily activity', B.life, c.line], ['Digestion', B.tef, c.fat], ['Steps', B.stepK, c.carb], ['Training', B.train, c.accent],
  ];
  const macro = (label: string, have: number, goal: number, col: string) => (
    <View style={{ flex: 1, gap: 4 }}>
      <T muted size={13}>{label}</T>
      <T size={17} weight="600">{fmt(have)}<T muted size={13}> / {goal} g</T></T>
      <Meter pct={(have / goal) * 100} color={col} height={6} />
    </View>
  );
  const lifts = x?.training.lifts ?? [], cardio = x?.training.cardio ?? [];

  return (
    <Screen>
      <Card>
        <View style={{ flexDirection: 'row' }}>
          {[['Eaten', fmt(I.kcal), c.ink], [isToday ? 'Burned so far' : 'Burned', fmt(B.total), c.ink], ['Net', sgn(net), net < 0 ? c.good : c.warn]].map(([l, v, col], i) => (
            <View key={l} style={{ flex: 1, paddingLeft: i ? 12 : 0, borderLeftWidth: i ? 1 : 0, borderLeftColor: c.line, gap: 2 }}>
              <T muted size={13}>{l}</T>
              <T size={26} weight="700" style={{ color: col }}>{v}</T>
              <T muted size={12}>kcal</T>
            </View>
          ))}
        </View>
        <Meter pct={(I.kcal / t.kcal) * 100} color={I.kcal > t.kcal ? c.bad : c.accent} height={10} />
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <T size={14} style={{ color: left < 0 ? c.bad : c.ink }}>{left >= 0 ? `${fmt(left)} kcal left` : `${fmt(-left)} kcal over`}</T>
          <T muted size={13}>Target {fmt(t.kcal)} · {GOALS[p.goal]?.label}</T>
        </Row>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {macro('Protein', I.p, t.pro, c.pro)}{macro('Carbs', I.c, t.carb, c.carb)}{macro('Fat', I.f, t.fat, c.fat)}
        </View>
      </Card>

      <Card>
        <H right={<T muted size={14}>{fmt(B.total)} kcal</T>}>Calories burned</H>
        <View style={{ flexDirection: 'row', height: 12, borderRadius: 3, overflow: 'hidden', gap: 2 }}>
          {parts.map(([l, v, col]) => (v > 0 ? <View key={l} style={{ flex: v, backgroundColor: col }} /> : null))}
        </View>
        {parts.map(([l, v, col]) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: col }} />
            <T style={{ flex: 1 }} size={14}>{l}</T>
            <T size={14}>{fmt(v)}</T>
          </View>
        ))}
        <Note>Estimates. BMR: Mifflin–St Jeor at {fmt(u.wOut(B.w), 1)} {u.wU}. Steps: about {fmt(0.0005 * B.w * 1000)} kcal per 1,000.</Note>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <T muted size={13}>Weight ({u.wU}){x?.weightSource === 'health' ? ' · Health' : ''}</T>
          <Field value={w} onChangeText={setW} keyboardType="decimal-pad" placeholder={fmt(u.wOut(m.weightOn(date)), 1)} style={{ minWidth: 0 }} />
          <Btn small kind="primary" title="Save" onPress={() => {
            const v = num(w);
            editDay(date, (d) => { d.weight = v == null ? null : Math.round(u.wIn(v)! * 100) / 100; d.weightSource = 'manual'; });
          }} />
        </Card>
        <Card style={{ flex: 1 }}>
          <T muted size={13}>Steps{x?.stepsSource === 'health' ? ' · Health' : ''}</T>
          <Field value={steps} onChangeText={setSteps} keyboardType="number-pad" placeholder="0" style={{ minWidth: 0 }} />
          <Btn small kind="primary" title="Save" onPress={() => {
            const v = num(steps);
            editDay(date, (d) => { d.steps = v == null ? null : Math.round(v); d.stepsSource = v == null ? undefined : 'manual'; });
          }} />
        </Card>
      </View>

      <Card>
        <H right={<Btn small title="Log food" onPress={() => router.navigate('/food')} />}>Food</H>
        {x?.foods.length ? x.foods.slice(-6).reverse().map((f) => (
          <Item key={f.id} title={f.name} meta={`${f.meal ?? ''} · P${fmt(f.p)} C${fmt(f.c)} F${fmt(f.f)}`} right={fmt(f.kcal)} />
        )) : <T muted>No food logged yet.</T>}
      </Card>

      <Card>
        <H right={<Btn small title="Log training" onPress={() => router.navigate('/training')} />}>Training</H>
        {lifts.length || cardio.length ? (
          <>
            {lifts.map((l) => <Item key={l.id} title={l.name} meta={l.sets.map((s) => `${fmt(u.wOut(s.kg), 1)}×${s.reps}`).join('  ')} />)}
            {cardio.map((cd) => <Item key={cd.id} title={cd.type} meta={`${fmt(cd.minutes)} min`} right={fmt(m.cardioKcal(cd, B.w))} />)}
          </>
        ) : <T muted>No training logged.</T>}
      </Card>
    </Screen>
  );
}
