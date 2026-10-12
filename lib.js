import { createClient } from '@supabase/supabase-js';
import { isConfigured, safeExternalUrl } from './utils.js';
const env = import.meta.env;
export const configured = isConfigured(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
);
export const supabase = configured
  ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
export const formUrl = safeExternalUrl(env.VITE_GOOGLE_FORM_URL);
export const siteUrl = (env.VITE_SITE_URL || window.location.origin).replace(
  /\/$/,
  '',
);
export const defaultSettings = {
  site_name: 'Datezy',
  logo_url: '',
  fees_enabled: true,
  male_fee: 299,
  female_fee: 299,
  referral_reward: 200,
  support_contact: env.VITE_SUPPORT_EMAIL || '',
  payment_methods: [],
  payment_instructions:
    'Payment methods are not configured. Do not send money yet.',
  terms: '',
  privacy: '',
  community: '',
  refund_policy:
    'Payment and refund terms must be published by the operator before fees are collected. Do not pay while this notice is displayed.',
  referral_terms:
    'Rewards require an eligible, unique, approved account, verified required payment, and a documented fraud review. Payout timing is determined by the published referral terms. Rewards are not guaranteed.',
  approval_requirements:
    '18+, respectful bio, listing consent, verified required payment, and manual profile review.',
};
export async function rpc(name, args = {}) {
  if (!supabase)
    throw new Error('Supabase is not configured. Follow README setup.');
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}
export async function read(
  table,
  { own, key = 'user_id', order = 'created_at' } = {},
) {
  const rows = [];
  for (let from = 0; ; from += 500) {
    let q = supabase
      .from(table)
      .select('*')
      .range(from, from + 499);
    if (own) q = q.eq(key, own);
    if (order) q = q.order(order, { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 500) break;
  }
  return rows;
}
export async function signedPhoto(path) {
  if (!path || !supabase) return '';
  const { data, error } = await supabase.storage
    .from('profile-photos')
    .createSignedUrl(path, 900);
  return error ? '' : data.signedUrl;
}

export async function preparePhoto(file) {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 5242880
  )
    throw new Error('Choose JPEG, PNG, or WebP, maximum 5 MB.');
  const bitmap = await createImageBitmap(file);
  if (bitmap.width > 16000 || bitmap.height > 16000) {
    bitmap.close();
    throw new Error('Image dimensions are too large.');
  }
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.88),
  );
  if (!blob) throw new Error('Photo could not be processed.');
  return blob;
}
