// Export everything to a JSON file (save to Files, iCloud Drive, AirDrop...) and import an export back.
// The import accepts the JSON exported by the web version of the tracker.
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { parseBackup, todayS } from './calc';
import type { Docs } from './types';

export async function exportBackup(docs: Docs) {
  const file = new File(Paths.cache, `fitness-tracker-${todayS()}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(docs, null, 2));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save backup' });
}

/** Returns null if the person cancelled. */
export async function pickBackup(): Promise<Docs | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.length) return null;
  const text = await new File(r.assets[0].uri).text();
  return parseBackup(text);
}

/* Progress photos live in the app's documents folder; the day record keeps the file name. */
const photoDir = () => {
  const d = new Directory(Paths.document, 'photos');
  if (!d.exists) d.create({ idempotent: true });
  return d;
};
export async function savePhoto(uri: string) {
  const name = `p-${Date.now()}.jpg`;
  await new File(uri).copy(new File(photoDir(), name));
  return name;
}
export const photoUri = (id: string) => {
  const f = new File(photoDir(), id);
  return f.exists ? f.uri : null;
};
export const deletePhoto = (id: string) => {
  const f = new File(photoDir(), id);
  if (f.exists) f.delete();
};
