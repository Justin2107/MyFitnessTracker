import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Btn, Card, Chip, Field, H, Item, Note, Row, Screen, Seg, Stat, T } from '@/components/ui';
import { LineChart } from '@/components/charts';
import { NeedsSetup } from '@/components/NeedsSetup';
import { CARDIO, EXERCISES, diffD, fmt, fmtD, nid, num, range, todayS, units } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

export default function Training() {
  return <NeedsSetup><TrainingInner /></NeedsSetup>;
}

type DraftSet = { kg: string; reps: string };
const emptySets = (): DraftSet[] => [{ kg: '', reps: '' }, { kg: '', reps: '' }, { kg: '', reps: '' }];

function TrainingInner() {
  const c = useColors();
  const { m, date, editDay } = useStore();
  const u = units(m.prof);
  const x = m.day(date);
  const w = m.weightOn(date);
  const H_ = useMemo(() => m.liftHistory(), [m]);
  const [name, setName] = useState('');
  const [sets, setSets] = useState<DraftSet[]>(emptySets());
  const [err, setErr] = useState('');
  const [cType, setCType] = useState(Object.keys(CARDIO)[0]);
  const [cMin, setCMin] = useState('');
  const [cKcal, setCKcal] = useState('');
  const [minutes, setMinutes] = useState('');
  const exs = Object.values(H_).sort((a, b) => b.sessions.length - a.sessions.length);
  const [selEx, setSelEx] = useState<string | null>(null);
  const sel = (selEx && H_[selEx]) || exs[0];

  const allNames = useMemo(() => [...new Set([...Object.keys(H_), ...EXERCISES])], [H_]);
  const q = name.trim().toLowerCase();
  const suggestions = q && !allNames.some((n) => n.toLowerCase() === q) ? allNames.filter((n) => n.toLowerCase().includes(q)).slice(0, 6) : [];
  const last = H_[name.trim()]?.sessions.filter((s) => s.date < date).pop();
  const toDraft = (s: { kg: number; reps: number }[]) => s.map((y) => ({ kg: fmt(u.wOut(y.kg), 1).replace(/,/g, ''), reps: String(y.reps) }));

  const chooseName = (n: string) => {
    setName(n);
    const prev = H_[n]?.sessions.filter((s) => s.date < date).pop() ?? H_[n]?.last;
    if (prev && sets.every((s) => !s.kg && !s.reps)) setSets(toDraft(prev.sets));
  };
  const updSet = (i: number, k: keyof DraftSet, v: string) => setSets(sets.map((s, j) => (j === i ? { ...s, [k]: v } : s)));

  const saveLift = () => {
    const n = name.trim();
    if (!n) { setErr('Enter an exercise name.'); return; }
    const clean = sets.map((s) => ({ kg: num(s.kg) ?? 0, reps: num(s.reps) })).filter((s) => s.reps).map((s) => ({ kg: Math.round(u.wIn(s.kg)! * 100) / 100, reps: Math.round(s.reps!) }));
    if (!clean.length) { setErr('Enter reps for at least one set.'); return; }
    editDay(date, (d) => d.training.lifts.push({ id: nid(), name: n, sets: clean }));
    setName(''); setSets(emptySets()); setErr('');
  };

  const isPR = (n: string) => {
    const h = H_[n];
    const s = h?.sessions.find((y) => y.date === date);
    const before = h?.sessions.filter((y) => y.date < date) ?? [];
    return !!s && before.length > 0 && s.best > Math.max(...before.map((y) => y.best));
  };

  const lifts = x?.training.lifts ?? [], cardio = x?.training.cardio ?? [];
  const totalK = m.liftKcal(x, w) + cardio.reduce((a, cd) => a + m.cardioKcal(cd, w), 0);

  let chart = null;
  if (sel) {
    const n = Math.min(180, Math.max(2, diffD(sel.sessions[0].date, todayS()) + 1));
    const dates = range(todayS(), n);
    const byD = Object.fromEntries(sel.sessions.map((s) => [s.date, s.best]));
    let carry: number | null = null;
    const tr = dates.map((d) => { if (byD[d] != null) carry = byD[d]; return carry == null ? null : u.wOut(carry); });
    const raw = dates.map((d) => (byD[d] != null ? u.wOut(byD[d]) : null));
    chart = <LineChart dates={dates} raw={raw} trend={tr} />;
  }

  return (
    <Screen>
      <Card>
        <H>Log a lift</H>
        <Field label="Exercise" value={name} onChangeText={setName} onEndEditing={() => name.trim() && chooseName(name.trim())} placeholder="Bench Press" autoCorrect={false} />
        {suggestions.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {suggestions.map((s) => <Chip key={s} label={s} onPress={() => chooseName(s)} />)}
          </View>
        ) : null}
        {last ? (
          <Row style={{ alignItems: 'center' }}>
            <T muted size={13} style={{ flex: 1 }}>Last time ({fmtD(last.date, { day: 'numeric', month: 'short' })}): {last.sets.map((s) => `${fmt(u.wOut(s.kg), 1)}×${s.reps}`).join('  ')}</T>
            <Btn small kind="ghost" title="Copy" onPress={() => setSets(toDraft(last.sets))} />
          </Row>
        ) : null}
        {sets.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T muted size={13} style={{ width: 18, textAlign: 'center' }}>{i + 1}</T>
            <Field value={s.kg} onChangeText={(v) => updSet(i, 'kg', v)} keyboardType="decimal-pad" placeholder={u.wU} style={{ minWidth: 0 }} />
            <T muted>×</T>
            <Field value={s.reps} onChangeText={(v) => updSet(i, 'reps', v)} keyboardType="number-pad" placeholder="reps" style={{ minWidth: 0 }} />
            <Pressable hitSlop={8} onPress={() => setSets(sets.length > 1 ? sets.filter((_, j) => j !== i) : emptySets())} accessibilityLabel="Remove set">
              <Ionicons name="close" size={18} color={c.muted} />
            </Pressable>
          </View>
        ))}
        <Row style={{ justifyContent: 'space-between' }}>
          <Btn small title="Add set" onPress={() => setSets([...sets, { ...(sets[sets.length - 1] ?? { kg: '', reps: '' }) }])} />
          <Btn kind="primary" title="Save exercise" onPress={saveLift} />
        </Row>
        {err ? <T size={14} style={{ color: c.bad }}>{err}</T> : null}
      </Card>

      <Card>
        <H>Cardio</H>
        <Seg value={cType} onChange={setCType} options={Object.keys(CARDIO).map((k) => [k, k] as [string, string])} />
        <Row>
          <Field label="Minutes" value={cMin} onChangeText={setCMin} keyboardType="number-pad" />
          <Field label="kcal (from watch)" value={cKcal} onChangeText={setCKcal} keyboardType="number-pad" placeholder="auto" />
          <Btn kind="primary" title="Add" onPress={() => {
            if (!num(cMin)) return;
            editDay(date, (d) => d.training.cardio.push({ id: nid(), type: cType, minutes: num(cMin)!, kcal: num(cKcal) }));
            setCMin(''); setCKcal('');
          }} />
        </Row>
        <Note>Leave kcal blank to estimate it. Don't log everyday walking here; steps already count it.</Note>
      </Card>

      <Card>
        <H right={<T muted size={14}>≈ {fmt(totalK)} kcal</T>}>Training log</H>
        <Row style={{ alignItems: 'center' }}>
          <Field label="Lifting minutes" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" placeholder={x?.training.minutes ? String(x.training.minutes) : m.setsCount(x) ? `${m.setsCount(x) * 3} (estimated)` : '—'} />
          <Btn title="Set" onPress={() => { editDay(date, (d) => { d.training.minutes = num(minutes); }); setMinutes(''); }} />
        </Row>
        {lifts.map((l) => {
          const vol = l.sets.reduce((a, s) => a + (+s.kg || 0) * (+s.reps || 0), 0);
          return (
            <Item key={l.id} title={l.name + (isPR(l.name) ? '  · PR' : '')}
              meta={`${l.sets.map((s) => `${fmt(u.wOut(s.kg), 1)}×${s.reps}`).join('  ')}\n${l.sets.length} sets · ${fmt(u.wOut(vol))} ${u.wU} volume`}
              onDelete={() => editDay(date, (d) => { d.training.lifts = d.training.lifts.filter((y) => y.id !== l.id); })} />
          );
        })}
        {cardio.map((cd) => (
          <Item key={cd.id} title={cd.type} meta={`${fmt(cd.minutes)} min · ${cd.kcal != null ? 'measured' : 'estimated'}`} right={`${fmt(m.cardioKcal(cd, w))} kcal`}
            onDelete={() => editDay(date, (d) => { d.training.cardio = d.training.cardio.filter((y) => y.id !== cd.id); })} />
        ))}
        {!lifts.length && !cardio.length ? <T muted>Nothing logged for this day.</T> : null}
      </Card>

      <Card>
        <H>Strength</H>
        {sel ? (
          <>
            <Seg value={sel.name} onChange={setSelEx} options={exs.slice(0, 8).map((h) => [h.name, h.name] as [string, string])} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Stat label="Best est. 1RM" value={fmt(u.wOut(sel.best), 1)} unit={u.wU} />
              <Stat label="Heaviest set" value={fmt(u.wOut(sel.top), 1)} unit={u.wU} />
              <Stat label="Sessions" value={String(sel.sessions.length)} />
            </View>
            {chart}
            <Note>Estimated 1RM uses the Epley formula.</Note>
          </>
        ) : <T muted>No lifts logged yet.</T>}
      </Card>

      {exs.length ? (
        <Card>
          <H>Personal records</H>
          {exs.map((h) => (
            <Item key={h.name} title={h.name} meta={`Last ${fmtD(h.last.date, { day: 'numeric', month: 'short' })}`} right={`${fmt(u.wOut(h.best), 1)} ${u.wU} 1RM · ${fmt(u.wOut(h.top), 1)} top`} />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
