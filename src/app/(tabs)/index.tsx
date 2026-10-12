import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Card, Field, H, Item, Meter, Note, Row, Screen, T } from '@/components/ui';
import { NeedsSetup } from '@/components/NeedsSetup';
import { GOALS, fmt, num, units } from '@/lib/calc';
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
  const w8 = m.weightOn(date);
  const t = m.targets(date);
  const left = t.kcal - I.kcal;
  const over = left < 0;

  const [w, setW] = useState('');
  const [steps, setSteps] = useState('');
  useEffect(() => {
    setW(x?.weight ? fmt(u.wOut(x.weight), 1).replace(/,/g, '') : '');
    setSteps(x?.steps != null ? String(x.steps) : '');
  }, [date, x?.weight, x?.steps, u.imp]);

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
        <View style={{ alignItems: 'center', gap: 2, paddingVertical: 6 }}>
          <T size={52} weight="700" style={{ color: over ? c.bad : c.ink }}>{fmt(Math.abs(left))}</T>
          <T muted size={15}>{over ? 'kcal over' : 'kcal left'}</T>
        </View>
        <Meter pct={over ? 100 : (left / t.kcal) * 100} color={over ? c.bad : c.accent} height={10} />
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <T muted size={14}>Goal {fmt(t.kcal)}</T>
          <T muted size={14}>Eaten {fmt(I.kcal)}</T>
        </Row>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {macro('Protein', I.p, t.pro, c.pro)}{macro('Carbs', I.c, t.carb, c.carb)}{macro('Fat', I.f, t.fat, c.fat)}
        </View>
        <Note>{GOALS[p.goal]?.label} goal. Your target already accounts for your usual steps and training.</Note>
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
            {cardio.map((cd) => <Item key={cd.id} title={cd.type} meta={`${fmt(cd.minutes)} min · ${fmt(m.cardioKcal(cd, w8))} kcal`} />)}
          </>
        ) : <T muted>No training logged.</T>}
      </Card>
    </Screen>
  );
}
