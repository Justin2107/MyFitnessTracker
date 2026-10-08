import { useEffect, useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Card, Field, H, Note, Row, Screen, Seg, T } from '@/components/ui';
import { GOALS, fmt, num, todayS } from '@/lib/calc';
import { DEFAULT_MODEL, getApiKey, setApiKey } from '@/lib/claude';
import { connectHealth, healthAvailable } from '@/lib/health';
import { exportBackup, pickBackup } from '@/lib/backup';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';
import type { GoalKey, Profile } from '@/lib/types';

export default function Setup() {
  const c = useColors();
  const { m, docs, saveProfile, editDay, importDocs, syncNow, syncing } = useStore();
  const p = m.prof;
  const [f, setF] = useState(() => formFrom(p, m.weightOn(todayS())));
  const [msg, setMsg] = useState('');
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [hkOk, setHkOk] = useState(false);
  useEffect(() => { getApiKey().then((k) => setHasKey(!!k)); healthAvailable().then(setHkOk); }, []);
  useEffect(() => { setF(formFrom(p, m.weightOn(todayS()))); }, [p?.units]);

  const imp = f.units === 'imperial';
  const t = p ? m.targets(todayS()) : null;

  const save = () => {
    const h = num(f.height), w = num(f.weight), gw = num(f.goalWeight);
    if (!h || !w || !num(f.age)) { setMsg('Enter age, height and weight.'); return; }
    const wKg = imp ? w / 2.20462 : w;
    const next: Profile = {
      ...(p ?? {}),
      units: f.units, sex: f.sex, age: num(f.age)!, height: imp ? h * 2.54 : h,
      goal: f.goal, trainDays: num(f.trainDays) ?? 4, typSteps: num(f.typSteps) ?? 8000,
      targetMode: f.targetMode, kcalTarget: num(f.kcalTarget), goalWeight: gw == null ? null : imp ? gw / 2.20462 : gw,
      startWeight: p?.startWeight ?? wKg, startDate: p?.startDate ?? todayS(),
      healthSync: p?.healthSync ?? false, aiModel: f.aiModel.trim() || undefined,
    };
    saveProfile(next);
    if (Math.abs(wKg - m.weightOn(todayS())) > 0.05 || !p) editDay(todayS(), (d) => { d.weight = Math.round(wKg * 100) / 100; d.weightSource = 'manual'; });
    setMsg('Saved.');
    if (!p) router.navigate('/');
  };

  const toggleHealth = async (on: boolean) => {
    if (!p) return;
    try {
      if (on) await connectHealth();
      saveProfile({ ...p, healthSync: on });
      if (on) setMsg(await syncNow());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not connect to Apple Health.');
    }
  };

  const doImport = async () => {
    try {
      const incoming = await pickBackup();
      if (!incoming) return;
      const days = Object.keys(incoming).filter((k) => k.startsWith('d-')).length;
      Alert.alert('Import backup?', `This adds ${days} days${incoming.profile ? ' and your profile' : ''}. Days that already exist here will be replaced by the file's version.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import', onPress: () => { const n = importDocs(incoming); setMsg(`Imported ${n} days.`); } },
      ]);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not read that file.');
    }
  };

  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  return (
    <Screen dateBar={false}>
      {!p ? (
        <Card>
          <H>Set up</H>
          <T muted>Enter your details to calculate your calorie and macro targets. Moving from the web version? Import your backup at the bottom of this page instead.</T>
        </Card>
      ) : null}

      <Card>
        <H>Profile</H>
        <Seg value={f.units} onChange={(v) => setF(convertUnits(f, v))} options={[['metric', 'kg / cm'], ['imperial', 'lb / in']]} />
        <Seg value={f.sex} onChange={(v) => setF({ ...f, sex: v })} options={[['m', 'Male'], ['f', 'Female']]} />
        <Row>
          <Field label="Age" value={f.age} onChangeText={set('age')} keyboardType="number-pad" />
          <Field label={`Height (${imp ? 'in' : 'cm'})`} value={f.height} onChangeText={set('height')} keyboardType="decimal-pad" />
        </Row>
        <Row>
          <Field label={`Current weight (${imp ? 'lb' : 'kg'})`} value={f.weight} onChangeText={set('weight')} keyboardType="decimal-pad" />
          <Field label={`Goal weight (${imp ? 'lb' : 'kg'})`} value={f.goalWeight} onChangeText={set('goalWeight')} keyboardType="decimal-pad" placeholder="optional" />
        </Row>
      </Card>

      <Card>
        <H>Plan</H>
        <Seg<GoalKey> value={f.goal} onChange={(v) => setF({ ...f, goal: v })} options={(Object.keys(GOALS) as GoalKey[]).map((k) => [k, GOALS[k].label])} />
        <T muted size={13}>{GOALS[f.goal].off > 0 ? '+' : ''}{GOALS[f.goal].off} kcal from maintenance</T>
        <Row>
          <Field label="Training days / week" value={f.trainDays} onChangeText={set('trainDays')} keyboardType="number-pad" />
          <Field label="Daily step goal" value={f.typSteps} onChangeText={set('typSteps')} keyboardType="number-pad" />
        </Row>
        <Seg value={f.targetMode} onChange={(v) => setF({ ...f, targetMode: v })} options={[['auto', 'Calculate target'], ['manual', 'Set my own']]} />
        {f.targetMode === 'manual' ? <Field label="Calorie target (kcal)" value={f.kcalTarget} onChangeText={set('kcalTarget')} keyboardType="number-pad" placeholder={t ? String(t.auto) : ''} /> : null}
        {t ? <T size={14}>Current targets: {fmt(t.kcal)} kcal · protein {t.pro} g · carbs {t.carb} g · fat {t.fat} g. Estimated maintenance {fmt(t.maint)} kcal.</T> : null}
        <Note>Protein: 2.2–2.4 g/kg when cutting, 1.8 g/kg otherwise. Fat: 0.8 g/kg. Carbs: the remaining calories.</Note>
        <Btn kind="primary" title="Save" onPress={save} />
        {msg ? <T size={14} style={{ color: c.accent }}>{msg}</T> : null}
      </Card>

      {p ? (
        <Card>
          <H right={<Switch value={!!p.healthSync} onValueChange={toggleHealth} disabled={!hkOk} />}>Apple Health</H>
          <T muted size={14}>{hkOk ? 'Reads steps, weigh-ins and workouts automatically when you open the app. Values you type in yourself take priority.' : 'Apple Health is not available in this build. It needs the installed app, not Expo Go.'}</T>
          {p.healthSync ? <Btn title={syncing ? 'Syncing…' : 'Sync now'} disabled={syncing} onPress={async () => { try { setMsg(await syncNow()); } catch (e) { setMsg(e instanceof Error ? e.message : 'Sync failed.'); } }} /> : null}
        </Card>
      ) : null}

      <Card>
        <H right={<T muted size={13}>{hasKey ? 'Key saved' : 'No key'}</T>}>Food estimates</H>
        <T muted size={14}>Uses your Anthropic API key to estimate calories from a description or photo. The key is stored in your iPhone keychain.</T>
        <Field label="API key" value={key} onChangeText={setKey} placeholder={hasKey ? '•••••••• (saved)' : 'sk-ant-…'} autoCapitalize="none" autoCorrect={false} secureTextEntry />
        <Row>
          <Btn kind="primary" title="Save key" onPress={async () => { if (!key.trim()) return; await setApiKey(key); setKey(''); setHasKey(true); setMsg('API key saved.'); }} />
          {hasKey ? <Btn kind="ghost" title="Remove key" onPress={async () => { await setApiKey(''); setHasKey(false); }} /> : null}
        </Row>
        <Field label="Model" value={f.aiModel} onChangeText={set('aiModel')} placeholder={DEFAULT_MODEL} autoCapitalize="none" autoCorrect={false} />
        {msg ? <T size={14} style={{ color: c.accent }}>{msg}</T> : null}
      </Card>

      <Card>
        <H>Your data</H>
        <T muted size={14}>Stored on this iPhone only. {m.days.length} days logged. Export a backup regularly and save it to iCloud Drive or Files.</T>
        <View style={{ gap: 8 }}>
          <Btn title="Export backup" onPress={() => exportBackup(docs).catch((e) => setMsg(e instanceof Error ? e.message : 'Export failed.'))} />
          <Btn title="Import backup" onPress={doImport} />
        </View>
        <Note>Import accepts the JSON file from the web version's Export JSON button, or a backup from this app. Photos are not included in backups.</Note>
      </Card>
    </Screen>
  );
}

type Form = {
  units: 'metric' | 'imperial'; sex: 'm' | 'f'; age: string; height: string; weight: string; goalWeight: string;
  goal: GoalKey; trainDays: string; typSteps: string; targetMode: 'auto' | 'manual'; kcalTarget: string; aiModel: string;
};
const s1 = (n: number | null | undefined) => (n == null ? '' : fmt(n, 1).replace(/,/g, ''));
function formFrom(p: Profile | null, weightKg: number): Form {
  const imp = p?.units === 'imperial';
  return {
    units: p?.units ?? 'metric', sex: p?.sex ?? 'm', age: p ? String(p.age) : '',
    height: p ? s1(imp ? p.height / 2.54 : p.height) : '',
    weight: p ? s1(imp ? weightKg * 2.20462 : weightKg) : '',
    goalWeight: p?.goalWeight ? s1(imp ? p.goalWeight * 2.20462 : p.goalWeight) : '',
    goal: p?.goal ?? 'recomp', trainDays: String(p?.trainDays ?? 4), typSteps: String(p?.typSteps ?? 8000),
    targetMode: p?.targetMode ?? 'auto', kcalTarget: p?.kcalTarget ? String(p.kcalTarget) : '', aiModel: p?.aiModel ?? '',
  };
}
function convertUnits(f: Form, to: Form['units']): Form {
  if (f.units === to) return f;
  const toImp = to === 'imperial';
  const w = (v: string) => { const n = num(v); return n == null ? '' : s1(toImp ? n * 2.20462 : n / 2.20462); };
  const l = (v: string) => { const n = num(v); return n == null ? '' : s1(toImp ? n / 2.54 : n * 2.54); };
  return { ...f, units: to, height: l(f.height), weight: w(f.weight), goalWeight: w(f.goalWeight) };
}
