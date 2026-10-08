// Simple SVG charts drawn to one scale each.
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { fmtD, type Model } from '@/lib/calc';
import { useColors } from '@/lib/theme';
import { T } from './ui';

const W = 360;

function niceTicks(min: number, max: number, n = 4) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const a = Math.floor(min / step) * step, b = Math.ceil(max / step) * step;
  const t: number[] = [];
  for (let v = a; v <= b + step / 2; v += step) t.push(+v.toFixed(6));
  return t;
}
const short = (d: string) => fmtD(d, { day: 'numeric', month: 'short' });
const kfmt = (t: number) => (t >= 1000 ? `${+(t / 1000).toFixed(1)}k` : String(t));

export function LineChart({ dates, raw = [], trend = [], yfmt = (v: number) => String(Math.round(v)), goal = null, h = 190 }: { dates: string[]; raw?: (number | null)[]; trend?: (number | null)[]; yfmt?: (v: number) => string; goal?: number | null; h?: number }) {
  const c = useColors();
  const M = { l: 38, r: 40, t: 10, b: 22 };
  const n = dates.length;
  const vals = [...raw, ...trend].filter((v): v is number => v != null).concat(goal != null ? [goal] : []);
  if (!vals.length) return <T muted>Not enough data yet.</T>;
  const tk = niceTicks(Math.min(...vals), Math.max(...vals));
  const y0 = tk[0], y1 = tk[tk.length - 1];
  const X = (i: number) => M.l + (n <= 1 ? 0 : (i * (W - M.l - M.r)) / (n - 1));
  const Y = (v: number) => M.t + (1 - (v - y0) / (y1 - y0)) * (h - M.t - M.b);
  const pts = trend.map((v, i) => (v == null ? null : [X(i), Y(v)] as const)).filter((p): p is readonly [number, number] => !!p);
  const d = pts.length > 1 ? 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') : '';
  let lastI = -1;
  trend.forEach((v, i) => { if (v != null) lastI = i; });
  const labels = [...new Set([0, Math.floor((n - 1) / 2), n - 1])];
  return (
    <Svg viewBox={`0 0 ${W} ${h}`} width="100%" style={{ aspectRatio: W / h }}>
      {tk.map((t) => (
        <SvgText key={'g' + t} x={M.l - 5} y={Y(t) + 3.5} fontSize={10} fill={c.muted} textAnchor="end">{yfmt(t)}</SvgText>
      ))}
      {tk.map((t) => <Line key={'l' + t} x1={M.l} x2={W - M.r} y1={Y(t)} y2={Y(t)} stroke={c.line} strokeWidth={1} />)}
      {labels.map((i) => (
        <SvgText key={'x' + i} x={X(i)} y={h - 6} fontSize={10} fill={c.muted} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>{short(dates[i])}</SvgText>
      ))}
      {goal != null && goal >= y0 && goal <= y1 ? (
        <>
          <Line x1={M.l} x2={W - M.r} y1={Y(goal)} y2={Y(goal)} stroke={c.good} strokeDasharray="5 4" strokeWidth={1.5} />
          <SvgText x={W - M.r + 4} y={Y(goal) + 3.5} fontSize={10} fill={c.good}>goal</SvgText>
        </>
      ) : null}
      {raw.map((v, i) => (v != null ? <Circle key={'r' + i} cx={X(i)} cy={Y(v)} r={2.2} fill={c.muted} opacity={0.6} /> : null))}
      {d ? <Path d={d} stroke={c.accent} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
      {lastI >= 0 ? (
        <>
          <Circle cx={X(lastI)} cy={Y(trend[lastI]!)} r={4} fill={c.accent} stroke={c.surface} strokeWidth={2} />
          <SvgText x={X(lastI) + 7} y={Y(trend[lastI]!) + 3.5} fontSize={10} fill={c.ink} fontWeight="600">{yfmt(trend[lastI]!)}</SvgText>
        </>
      ) : null}
    </Svg>
  );
}

export function EnergyChart({ dates, m, target }: { dates: string[]; m: Model; target: number }) {
  const c = useColors();
  const h = 200, M = { l: 34, r: 8, t: 10, b: 22 };
  const n = dates.length;
  const rows = dates.map((d) => ({ d, i: m.intake(m.day(d)).kcal, o: m.burn(d).total }));
  const tk = niceTicks(0, Math.max(target, ...rows.map((r) => r.i), ...rows.map((r) => r.o)));
  const y1 = tk[tk.length - 1];
  const bw = (W - M.l - M.r) / n;
  const X = (i: number) => M.l + i * bw;
  const Y = (v: number) => M.t + (1 - v / y1) * (h - M.t - M.b);
  const labels = [...new Set([0, Math.floor((n - 1) / 2), n - 1])];
  return (
    <Svg viewBox={`0 0 ${W} ${h}`} width="100%" style={{ aspectRatio: W / h }}>
      {tk.map((t) => <Line key={'l' + t} x1={M.l} x2={W - M.r} y1={Y(t)} y2={Y(t)} stroke={c.line} strokeWidth={1} />)}
      {tk.map((t) => <SvgText key={'t' + t} x={M.l - 4} y={Y(t) + 3.5} fontSize={10} fill={c.muted} textAnchor="end">{kfmt(t)}</SvgText>)}
      <Line x1={M.l} x2={W - M.r} y1={Y(target)} y2={Y(target)} stroke={c.muted} strokeDasharray="4 4" strokeWidth={1} />
      {rows.map((r, i) => (
        <Rect key={'b' + i} x={X(i) + bw * 0.18} y={Y(r.i)} width={bw * 0.64} height={Math.max(0, Y(0) - Y(r.i))} rx={1.5} fill={r.i > r.o ? c.warn : c.accent} />
      ))}
      {rows.map((r, i) => <Line key={'o' + i} x1={X(i) + bw * 0.08} x2={X(i) + bw * 0.92} y1={Y(r.o)} y2={Y(r.o)} stroke={c.ink} strokeWidth={1.6} />)}
      {labels.map((i) => <SvgText key={'x' + i} x={X(i) + bw / 2} y={h - 6} fontSize={10} fill={c.muted} textAnchor="middle">{short(dates[i])}</SvgText>)}
    </Svg>
  );
}

export function BarChart({ dates, vals, goal }: { dates: string[]; vals: number[]; goal?: number }) {
  const c = useColors();
  const h = 160, M = { l: 34, r: 8, t: 10, b: 22 };
  const n = dates.length;
  const tk = niceTicks(0, Math.max(1, ...vals, goal ?? 0));
  const y1 = tk[tk.length - 1];
  const bw = (W - M.l - M.r) / n;
  const X = (i: number) => M.l + i * bw;
  const Y = (v: number) => M.t + (1 - v / y1) * (h - M.t - M.b);
  const labels = [...new Set([0, Math.floor((n - 1) / 2), n - 1])];
  return (
    <Svg viewBox={`0 0 ${W} ${h}`} width="100%" style={{ aspectRatio: W / h }}>
      {tk.map((t) => <Line key={'l' + t} x1={M.l} x2={W - M.r} y1={Y(t)} y2={Y(t)} stroke={c.line} strokeWidth={1} />)}
      {tk.map((t) => <SvgText key={'t' + t} x={M.l - 4} y={Y(t) + 3.5} fontSize={10} fill={c.muted} textAnchor="end">{kfmt(t)}</SvgText>)}
      {goal ? <Line x1={M.l} x2={W - M.r} y1={Y(goal)} y2={Y(goal)} stroke={c.good} strokeDasharray="5 4" strokeWidth={1.5} /> : null}
      {vals.map((v, i) => (v ? <Rect key={'b' + i} x={X(i) + bw * 0.18} y={Y(v)} width={bw * 0.64} height={Y(0) - Y(v)} rx={1.5} fill={c.carb} /> : null))}
      {labels.map((i) => <SvgText key={'x' + i} x={X(i) + bw / 2} y={h - 6} fontSize={10} fill={c.muted} textAnchor="middle">{short(dates[i])}</SvgText>)}
    </Svg>
  );
}
