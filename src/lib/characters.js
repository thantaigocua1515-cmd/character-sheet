import { supabase } from './supabase.js';

export const DEFAULT_EXPRESSIONS = ['Happy', 'Curious', 'Surprised', 'Mischievous', 'Angry', 'Confident'];

// Prefill theo đúng ảnh mẫu Khang gửi (Squirrel / Panda)
export function defaultCharacters() {
  return [
    {
      slot: 1,
      name: 'Squirrel',
      species: 'Red squirrel',
      role: 'Main Character',
      personality: 'Energetic, clever, playful, brave',
      traits: 'Quick, curious, determined',
      age: 'Young (Adult)',
      art_style: 'Pixar-like family animation style',
      hero_pose: 'standing confidently with hands on hips, big fluffy tail raised behind',
      palette: [
        { label: 'burnt orange fur', hex: '#B85C2B' },
        { label: 'light cream belly', hex: '#F6E7D3' },
        { label: 'pink inner ears', hex: '#F0A6B8' },
        { label: 'dark brown outlines', hex: '#2A1E14' },
        { label: 'green eyes', hex: '#3E8E41' },
        { label: 'tail darker tip', hex: '#8A3E1C' },
      ],
      expressions: [...DEFAULT_EXPRESSIONS],
      actions: [
        'running fast holding a green bamboo stick',
        'jumping mid-air with arms raised cheering',
        'crouching low ready to pounce',
      ],
    },
    {
      slot: 2,
      name: 'Panda',
      species: 'Giant panda',
      role: 'Main Character',
      personality: 'Gentle, hungry, funny, kind, clumsy',
      traits: 'Strong, lovable, emotional, persistent',
      age: 'Young (Adult)',
      art_style: 'Pixar-like family animation style',
      hero_pose: 'sitting with a slightly worried funny face, paws resting on big belly',
      palette: [
        { label: 'black fur', hex: '#1E1A16' },
        { label: 'white fur', hex: '#F7F3EC' },
        { label: 'brown shorts', hex: '#8A6B4F' },
        { label: 'dark eye patches', hex: '#2A2320' },
      ],
      expressions: ['Happy', 'Surprised', 'Sad', 'Worried', 'Hungry', 'Funny'],
      actions: [
        'waving hello with one paw raised',
        'lying on belly eating bamboo',
        'sitting and scratching head shyly',
      ],
    },
  ];
}

export async function loadCharacters() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('cs_characters')
    .select('*')
    .eq('user_id', user.id)
    .order('slot', { ascending: true });
  if (error) throw error;
  return data;
}

export async function saveCharacter(char) {
  const { data: { user } } = await supabase.auth.getUser();
  const payload = {
    user_id: user.id,
    slot: char.slot,
    name: char.name || '',
    species: char.species || '',
    role: char.role || 'Main Character',
    personality: char.personality || '',
    traits: char.traits || '',
    age: char.age || '',
    palette: char.palette || [],
    art_style: char.art_style || 'Pixar-like family animation style',
    hero_pose: char.hero_pose || '',
    expressions: char.expressions || [],
    actions: char.actions || [],
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('cs_characters')
    .upsert(payload, { onConflict: 'user_id,slot' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
