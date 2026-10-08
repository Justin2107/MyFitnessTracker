import { useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Btn, Card, Chip, Field, H, Item, Note, Row, Screen, Seg, T } from '@/components/ui';
import { NeedsSetup } from '@/components/NeedsSetup';
import { MEALS, defaultMeal, fmt, nid, num } from '@/lib/calc';
import { estimateFood, type Estimate } from '@/lib/claude';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

export default function Food() {
  return <NeedsSetup><FoodInner /></NeedsSetup>;
}

type Mode = 'describe' | 'photo' | 'manual';

function FoodInner() {
  const c = useColors();
  const { m, date, editDay } = useStore();
  const x = m.day(date);
  const I = m.intake(x);
  const t = m.targets(date);
  const [mode, setMode] = useState<Mode>('describe');
  const [meal, setMeal] = useState<string>(defaultMeal());
  const [desc, setDesc] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [est, setEst] = useState<Estimate[] | null>(null);
  const [man, setMan] = useState({ name: '', kcal: '', p: '', c: '', f: '' });

  const pick = async (camera: boolean) => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5, base64: true };
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setErr('Camera access is off. Turn it on in Settings > My Fitness Tracker.'); return; }
    }
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!r.canceled && r.assets[0]?.base64) { setPhoto({ uri: r.assets[0].uri, base64: r.assets[0].base64 }); setErr(''); }
  };

  const run = async () => {
    if (mode === 'describe' && !desc.trim()) { setErr('Describe what you ate first.'); return; }
    if (mode === 'photo' && !photo) { setErr('Take or choose a photo first.'); return; }
    setBusy(true); setErr(''); setEst(null);
    try {
      setEst(await estimateFood({ description: desc.trim(), imageBase64: mode === 'photo' ? photo?.base64 : undefined, model: m.prof?.aiModel }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not get an estimate.');
    } finally {
      setBusy(false);
    }
  };

  const addEstimate = () => {
    if (!est) return;
    editDay(date, (d) => {
      for (const r of est) d.foods.push({ id: nid(), name: r.name, kcal: Math.round(r.kcal), p: Math.round(r.protein), c: Math.round(r.carbs), f: Math.round(r.fat), meal, at: Date.now(), src: 'ai' });
    });
    setEst(null); setDesc(''); setPhoto(null);
  };
  const setEstKcal = (i: number, v: string) => setEst((prev) => {
    if (!prev) return prev;
    const next = prev.slice();
    const r = { ...next[i] };
    const nk = num(v) ?? 0;
    if (r.kcal > 0 && nk !== r.kcal) { const k = nk / r.kcal; r.protein *= k; r.carbs *= k; r.fat *= k; }
    r.kcal = nk;
    next[i] = r;
    return next;
  });

  const recent = m.recentFoods();
  const groups = MEALS.map((ml) => ({ ml, items: (x?.foods ?? []).filter((f) => (f.meal ?? 'Snacks') === ml) })).filter((g) => g.items.length);

  return (
    <Screen>
      <Card>
        <H>Log food</H>
        <Seg<Mode> value={mode} onChange={(k) => { setMode(k); setErr(''); }} options={[['describe', 'Describe'], ['photo', 'Photo'], ['manual', 'Manual']]} />
        <Seg value={meal} onChange={setMeal} options={MEALS.map((ml) => [ml, ml] as [string, string])} />

        {mode === 'describe' && (
          <>
            <Field label="What did you eat?" value={desc} onChangeText={setDesc} multiline placeholder="3 eggs scrambled in butter, 2 slices sourdough toast, a banana, flat white" />
            <Btn kind="primary" title={busy ? 'Estimating…' : 'Estimate calories'} onPress={run} disabled={busy} />
          </>
        )}
        {mode === 'photo' && (
          <>
            {photo ? <Image source={{ uri: photo.uri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 8 }} /> : null}
            <Row><Btn title="Take photo" onPress={() => pick(true)} /><Btn title="Choose photo" onPress={() => pick(false)} /></Row>
            <Field label="Notes (optional)" value={desc} onChangeText={setDesc} placeholder="cooked in 1 tbsp olive oil, about 200 g rice" />
            <Btn kind="primary" title={busy ? 'Estimating…' : 'Estimate from photo'} onPress={run} disabled={busy} />
          </>
        )}
        {mode === 'manual' && (
          <>
            <Field label="Food" value={man.name} onChangeText={(v) => setMan({ ...man, name: v })} placeholder="Greek yogurt 0%, 250 g" />
            <Row>
              <Field label="kcal" value={man.kcal} onChangeText={(v) => setMan({ ...man, kcal: v })} keyboardType="number-pad" />
              <Field label="Protein g" value={man.p} onChangeText={(v) => setMan({ ...man, p: v })} keyboardType="decimal-pad" />
              <Field label="Carbs g" value={man.c} onChangeText={(v) => setMan({ ...man, c: v })} keyboardType="decimal-pad" />
              <Field label="Fat g" value={man.f} onChangeText={(v) => setMan({ ...man, f: v })} keyboardType="decimal-pad" />
            </Row>
            <Btn kind="primary" title="Add" onPress={() => {
              if (!man.name.trim() || num(man.kcal) == null) { setErr('Enter a name and kcal.'); return; }
              editDay(date, (d) => d.foods.push({ id: nid(), name: man.name.trim(), kcal: num(man.kcal)!, p: num(man.p) ?? 0, c: num(man.c) ?? 0, f: num(man.f) ?? 0, meal, at: Date.now() }));
              setMan({ name: '', kcal: '', p: '', c: '', f: '' }); setErr('');
            }} />
          </>
        )}
        {busy ? <ActivityIndicator /> : null}
        {err ? <T size={14} style={{ color: c.bad }}>{err}</T> : null}

        {est ? (
          <View style={{ backgroundColor: c.accentSoft, borderRadius: 8, padding: 12, gap: 8 }}>
            <H right={<T size={14}>{fmt(est.reduce((a, r) => a + r.kcal, 0))} kcal</T>}>Estimate</H>
            {est.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <T size={14}>{r.name}</T>
                  <T muted size={12}>P{fmt(r.protein)} C{fmt(r.carbs)} F{fmt(r.fat)}</T>
                </View>
                <Field value={String(Math.round(r.kcal))} onChangeText={(v) => setEstKcal(i, v)} keyboardType="number-pad" style={{ flex: 0, minWidth: 72, maxWidth: 80 }} />
                <Btn small kind="ghost" title="Remove" onPress={() => setEst(est.length > 1 ? est.filter((_, j) => j !== i) : null)} />
              </View>
            ))}
            <Row><Btn kind="primary" title={`Add to ${meal}`} onPress={addEstimate} /><Btn kind="ghost" title="Discard" onPress={() => setEst(null)} /></Row>
            <Note>Edit any value before adding. Changing kcal scales the macros.</Note>
          </View>
        ) : null}
      </Card>

      {recent.length ? (
        <Card>
          <H right={<T muted size={13}>Tap to add to {meal}</T>}>Recent foods</H>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {recent.map((f) => (
              <Chip key={f.id + f.name} label={f.name} sub={fmt(f.kcal)} onPress={() => editDay(date, (d) => d.foods.push({ ...f, id: nid(), meal, at: Date.now() }))} />
            ))}
          </View>
        </Card>
      ) : null}

      <Card>
        <H right={<T size={14}>{fmt(I.kcal)} / {fmt(t.kcal)}</T>}>Food log</H>
        <T muted size={13}>Protein {fmt(I.p)}/{t.pro} g · Carbs {fmt(I.c)}/{t.carb} g · Fat {fmt(I.f)}/{t.fat} g</T>
        {groups.length ? groups.map((g) => (
          <View key={g.ml} style={{ gap: 0 }}>
            <H right={<T muted size={14}>{fmt(g.items.reduce((a, f) => a + (+f.kcal || 0), 0))} kcal</T>}>{g.ml}</H>
            {g.items.map((f) => (
              <Item key={f.id} title={f.name} meta={`P${fmt(f.p)} C${fmt(f.c)} F${fmt(f.f)}`} right={fmt(f.kcal)}
                onDelete={() => editDay(date, (d) => { d.foods = d.foods.filter((y) => y.id !== f.id); })} />
            ))}
          </View>
        )) : <T muted>No food logged for this day.</T>}
      </Card>
    </Screen>
  );
}
