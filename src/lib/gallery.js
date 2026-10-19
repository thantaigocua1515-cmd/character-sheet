import { supabase } from './supabase.js';

export async function listSheets(limit = 100) {
  const { data, error } = await supabase
    .from('cs_sheets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function signedImageUrl(path, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from('cs-sheets')
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteSheet(sheet) {
  const { error: rmErr } = await supabase.storage.from('cs-sheets').remove([sheet.storage_path]);
  if (rmErr) throw rmErr;
  const { error } = await supabase.from('cs_sheets').delete().eq('id', sheet.id);
  if (error) throw error;
}
