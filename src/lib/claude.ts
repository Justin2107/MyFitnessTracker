// Food estimates from a description and/or photo, using your own Anthropic API key.
// The key is stored in the iPhone keychain (expo-secure-store), never in the code.
import * as SecureStore from 'expo-secure-store';

const KEY = 'anthropic_api_key';
export const DEFAULT_MODEL = 'claude-sonnet-5-5';

export const getApiKey = () => SecureStore.getItemAsync(KEY);
export const setApiKey = (v: string) => (v ? SecureStore.setItemAsync(KEY, v.trim()) : SecureStore.deleteItemAsync(KEY));

export type Estimate = { name: string; kcal: number; protein: number; carbs: number; fat: number };

export async function estimateFood(opts: { description: string; imageBase64?: string; model?: string }): Promise<Estimate[]> {
  const key = await getApiKey();
  if (!key) throw new Error('Add your Anthropic API key in Setup to use estimates.');
  const prompt = `Estimate the calories and macronutrients for this food${opts.imageBase64 ? ' shown in the photo' : ''}. Use typical portion sizes when amounts aren't given, and include cooking oils, butter, sauces and drinks if they are mentioned or clearly visible. Split the meal into its distinct items.
${opts.description ? 'Description: ' + opts.description : 'No description; use the photo only.'}
Reply with only a JSON array, one object per item, like:
[{"name":"Scrambled eggs, 3 large with butter","kcal":310,"protein":19,"carbs":2,"fat":25}]
kcal is kilocalories; protein, carbs and fat are grams. Use whole numbers. Put the portion you assumed in the name.`;

  const content: unknown[] = [];
  if (opts.imageBase64) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: opts.imageBase64 } });
  content.push({ type: 'text', text: prompt });

  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: opts.model || DEFAULT_MODEL, max_tokens: 1024, messages: [{ role: 'user', content }] }),
    });
  } catch {
    throw new Error('No connection. Check your internet and try again.');
  }
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error?.message ?? ''; } catch { /* ignore */ }
    if (res.status === 401) throw new Error('Your API key was rejected. Check it in Setup.');
    if (res.status === 404 && /model/i.test(detail)) throw new Error('That model name was not found. Check the model in Setup.');
    if (res.status === 429) throw new Error('Too many requests. Wait a minute and try again.');
    if (res.status === 529 || res.status >= 500) throw new Error('Claude is busy right now. Try again shortly.');
    throw new Error(detail || `Request failed (${res.status}).`);
  }
  const json = await res.json();
  const text: string = (json.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
  const a = text.indexOf('['), b = text.lastIndexOf(']');
  if (a < 0 || b < a) throw new Error('Could not read the estimate. Try adding more detail.');
  const arr = JSON.parse(text.slice(a, b + 1));
  if (!Array.isArray(arr) || !arr.length) throw new Error('Could not read the estimate. Try adding more detail.');
  return arr
    .filter((r) => r && r.name)
    .map((r) => ({ name: String(r.name), kcal: +r.kcal || 0, protein: +r.protein || 0, carbs: +r.carbs || 0, fat: +r.fat || 0 }));
}
