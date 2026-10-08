import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Btn, Card, Field, H, Item, Note, Row, Screen, Seg, Stat, T } from '@/components/ui';
import { NeedsSetup } from '@/components/NeedsSetup';
import { MEAS, fmt, fmtD, navyBF, num, todayS, units } from '@/lib/calc';
import { deletePhoto, photoUri, savePhoto } from '@/lib/backup';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';
import type { MeasKey } from '@/lib/types';

export default function Body() {
  return <NeedsSetup><BodyInner /></NeedsSetup>;
}

const POSES = ['Front', 'Side', 'Back', 'Flex'];

function BodyInner() {
  const c = useColors();
  const { m, date, editDay } = useStore();
  const p = m.prof!;
  const u = units(p);
  const x = m.day(date);
  const lm = m.latestMeas();
  const w = m.weightOn(todayS());
  const bf = lm.bf ?? navyBF(p, lm);
  const lean = bf != null ? w * (1 - bf / 100) : null;
  const hM = p.height / 100;
  const ffmi = lean != null ? lean / (hM * hM) + 6.1 * (1.8 - hM) : null;
  const whtr = lm.waist ? lm.waist / p.height : null;
  const sw = lm.shoulders && lm.waist ? lm.shoulders / lm.waist : null;

  const [vals, setVals] = useState<Partial<Record<MeasKey, string>>>({});
  const [pose, setPose] = useState('Front');
  const [err, setErr] = useState('');
  useEffect(() => {
    const mm = x?.meas ?? {};
    const v: Partial<Record<MeasKey, string>> = {};
    for (const [k] of MEAS) if (mm[k] != null) v[k] = k === 'bf' ? String(mm[k]) : fmt(u.lOut(mm[k]), 1).replace(/,/g, '');
    setVals(v);
  }, [date, x?.meas, u.imp]);

  const addPhoto = async (camera: boolean) => {
    if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) { setErr('Camera access is off. Turn it on in Settings.'); return; }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets[0]) return;
    try {
      const id = await savePhoto(r.assets[0].uri);
      editDay(date, (d) => d.photos.push({ id, pose, at: Date.now() }));
      setErr('');
    } catch { setErr('Could not save the photo.'); }
  };

  const photos = m.days.flatMap((d) => d.photos.map((ph) => ({ ...ph, date: d.date, uri: photoUri(ph.id) }))).filter((ph) => ph.uri);
  const first = photos[0], latest = photos[photos.length - 1];
  const history = m.days.filter((d) => d.meas || d.weight).slice(-30).reverse();

  return (
    <Screen>
      <Card>
        <H right={<T muted size={13}>latest measurements</T>}>Body composition</H>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Stat label="Body fat" value={bf != null ? fmt(bf, 1) : '—'} unit={bf != null ? '%' : undefined} sub={bf == null ? `add waist + neck${p.sex === 'f' ? ' + hips' : ''}` : undefined} />
          <Stat label="Lean mass" value={lean != null ? fmt(u.wOut(lean), 1) : '—'} unit={lean != null ? u.wU : undefined} />
          <Stat label="FFMI" value={ffmi != null ? fmt(ffmi, 1) : '—'} sub="fat-free mass index" />
          <Stat label="Waist ÷ height" value={whtr != null ? fmt(whtr, 2) : '—'} sub="healthy: under 0.5" />
          <Stat label="Shoulder ÷ waist" value={sw != null ? fmt(sw, 2) : '—'} sub="reference: 1.618" />
        </View>
        <Note>Body fat uses the US Navy tape method unless you enter a measured value.</Note>
      </Card>

      <Card>
        <H right={<T muted size={13}>{fmtD(date)} · {u.lU}</T>}>Measurements</H>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {MEAS.map(([k, l]) => (
            <Field key={k} label={l} value={vals[k] ?? ''} onChangeText={(v) => setVals({ ...vals, [k]: v })} keyboardType="decimal-pad"
              placeholder={k !== 'bf' && lm[k] != null ? fmt(u.lOut(lm[k]), 1) : ''} style={{ flexBasis: '45%', flexGrow: 1 }} />
          ))}
        </View>
        <Btn kind="primary" title="Save measurements" onPress={() => {
          const out: Partial<Record<MeasKey, number>> = {};
          for (const [k] of MEAS) { const v = num(vals[k]); if (v != null) out[k] = k === 'bf' ? v : Math.round(u.lIn(v)! * 10) / 10; }
          editDay(date, (d) => { d.meas = Object.keys(out).length ? out : null; });
        }} />
        <Note>Measure in the morning. Waist at the navel, neck below the Adam's apple, arm flexed, hips at the widest point.</Note>
      </Card>

      <Card>
        <H>Progress photos</H>
        <Seg value={pose} onChange={setPose} options={POSES.map((ps) => [ps, ps] as [string, string])} />
        <Row><Btn title="Take photo" onPress={() => addPhoto(true)} /><Btn title="Choose photo" onPress={() => addPhoto(false)} /></Row>
        {err ? <T size={14} style={{ color: c.bad }}>{err}</T> : null}
        {first && latest && first !== latest ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[first, latest].map((ph) => (
              <View key={ph.id} style={{ flex: 1, gap: 4 }}>
                <Image source={{ uri: ph.uri! }} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 8, backgroundColor: c.sunk }} />
                <T muted size={12}>{fmtD(ph.date, { day: 'numeric', month: 'short', year: 'numeric' })}</T>
              </View>
            ))}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {photos.slice().reverse().map((ph) => (
            <Pressable key={ph.id} style={{ width: '31%' }} onLongPress={() => {
              editDay(ph.date, (d) => { d.photos = d.photos.filter((y) => y.id !== ph.id); });
              deletePhoto(ph.id);
            }}>
              <Image source={{ uri: ph.uri! }} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 6, backgroundColor: c.sunk }} />
              <T muted size={11}>{ph.pose} · {fmtD(ph.date, { day: 'numeric', month: 'short' })}</T>
            </Pressable>
          ))}
        </View>
        {photos.length ? <Note>Press and hold a photo to delete it.</Note> : null}
      </Card>

      <Card>
        <H>History</H>
        {history.length ? history.map((d) => {
          const mm = d.meas ?? {};
          const b = mm.bf ?? navyBF(p, mm);
          const parts = [
            d.weight ? `${fmt(u.wOut(d.weight), 1)} ${u.wU}` : null,
            mm.waist ? `waist ${fmt(u.lOut(mm.waist), 1)}` : null,
            mm.chest ? `chest ${fmt(u.lOut(mm.chest), 1)}` : null,
            mm.arm ? `arm ${fmt(u.lOut(mm.arm), 1)}` : null,
            b != null ? `${fmt(b, 1)}% fat` : null,
          ].filter(Boolean);
          return <Item key={d.date} title={fmtD(d.date, { day: 'numeric', month: 'short' })} meta={parts.join(' · ')} />;
        }) : <T muted>Weigh-ins and measurements show up here.</T>}
      </Card>
    </Screen>
  );
}
