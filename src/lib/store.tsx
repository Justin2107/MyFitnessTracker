// On-device storage. Every record is one row in a SQLite table: id = "profile" or "d-YYYY-MM-DD", json = the record.
// Keeping the same record shape as the web tracker makes import and export a straight copy.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { model, normalizeDay, todayS, type Model } from './calc';
import type { Day, Docs, Profile } from './types';
import { syncHealth } from './health';

const db = SQLite.openDatabaseSync('fitness.db');
db.execSync('CREATE TABLE IF NOT EXISTS docs (id TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL)');

function loadAll(): Docs {
  const rows = db.getAllSync<{ id: string; json: string }>('SELECT id, json FROM docs', []);
  const out: Docs = {};
  for (const r of rows) {
    try { out[r.id] = JSON.parse(r.json); } catch { /* skip a corrupt row */ }
  }
  return out;
}

type Store = {
  docs: Docs;
  m: Model;
  date: string;
  setDate: (d: string) => void;
  saveProfile: (p: Profile) => void;
  editDay: (date: string, fn: (d: Day) => void) => void;
  importDocs: (incoming: Docs) => number;
  syncNow: () => Promise<string>;
  syncing: boolean;
};
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [docs, setDocs] = useState<Docs>(loadAll);
  const [date, setDate] = useState(todayS());
  const [syncing, setSyncing] = useState(false);
  const docsRef = useRef(docs);
  docsRef.current = docs;

  const writeMany = useCallback((changes: Docs) => {
    db.withTransactionSync(() => {
      for (const [id, v] of Object.entries(changes))
        db.runSync('INSERT OR REPLACE INTO docs (id, json) VALUES (?, ?)', [id, JSON.stringify(v)]);
    });
    const next = { ...docsRef.current, ...changes };
    docsRef.current = next;
    setDocs(next);
  }, []);

  const saveProfile = useCallback((p: Profile) => writeMany({ profile: p }), [writeMany]);
  const editDay = useCallback((d: string, fn: (day: Day) => void) => {
    const copy = normalizeDay(JSON.parse(JSON.stringify(docsRef.current['d-' + d] ?? null)), d);
    fn(copy);
    writeMany({ ['d-' + d]: copy });
  }, [writeMany]);
  const importDocs = useCallback((incoming: Docs) => {
    writeMany(incoming);
    return Object.keys(incoming).filter((k) => k.startsWith('d-')).length;
  }, [writeMany]);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const changes = await syncHealth(docsRef.current, 21);
      if (Object.keys(changes).length) writeMany(changes);
      return `Updated ${Object.keys(changes).length} day${Object.keys(changes).length === 1 ? '' : 's'} from Apple Health.`;
    } finally {
      setSyncing(false);
    }
  }, [writeMany]);

  // Pull from Apple Health when the app opens or comes back to the foreground.
  useEffect(() => {
    const run = () => {
      const p = docsRef.current.profile as Profile | undefined;
      if (p?.healthSync) syncNow().catch(() => {});
      setDate((d) => (d > todayS() ? todayS() : d));
    };
    run();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') run(); });
    return () => sub.remove();
  }, [syncNow]);

  const m = useMemo(() => model(docs), [docs]);
  const value = useMemo(() => ({ docs, m, date, setDate, saveProfile, editDay, importDocs, syncNow, syncing }), [docs, m, date, saveProfile, editDay, importDocs, syncNow, syncing]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be inside StoreProvider');
  return s;
}
