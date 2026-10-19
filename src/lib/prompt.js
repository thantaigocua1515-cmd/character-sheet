// Prompt builder — template đã được Khang duyệt (xem prompt-template.md)
// Mỗi nhân vật = 1 prompt / 1 ảnh riêng để giữ đồng nhất thiết kế.

export function buildSheetPrompt(c) {
  const nameU = (c.name || 'CHARACTER').toUpperCase();
  const palette = (c.palette || [])
    .filter((p) => p.hex)
    .map((p) => `${p.label || 'color'} ${p.hex}`)
    .join(', ');
  const paletteCount = (c.palette || []).filter((p) => p.hex).length;
  const expr = [0, 1, 2, 3, 4, 5].map((i) => (c.expressions || [])[i] || `Expression ${i + 1}`);
  const acts = [0, 1, 2].map((i) => (c.actions || [])[i] || `dynamic pose ${i + 1}`);

  return (
    `Create a character model sheet for an animated movie, single image, bright solid yellow background.\n` +
    `\n` +
    `STYLE: 3D cartoon, ${c.art_style || 'Pixar-like family animation style'}, soft studio lighting, ` +
    `smooth fur, clean shapes, vibrant colors. Not photorealistic.\n` +
    `\n` +
    `CHARACTER\n` +
    `- Name (big bold cartoon title at top of sheet): ${nameU}\n` +
    `- Species: ${c.species || 'creature'}, ${c.age || ''}\n` +
    `- Role: ${c.role || 'Main Character'}\n` +
    `- Personality: ${c.personality || ''}\n` +
    `- Traits: ${c.traits || ''}\n` +
    `- Exact color palette: ${palette || 'as shown'}\n` +
    `\n` +
    `LAYOUT — one sheet, clearly separated labeled sections:\n` +
    `1. TOP HEADER: large 3D cartoon title "${nameU}" at top-left. Center: one big full-body hero pose, ` +
    `${c.hero_pose || 'standing in a confident pose'}. Beside the pose: a clean info panel with the text lines ` +
    `"Role: ${c.role || 'Main Character'}", "Personality: ${c.personality || ''}", ` +
    `"Traits: ${c.traits || ''}", "Species: ${c.species || ''}", "Age: ${c.age || ''}", and below it a ` +
    `horizontal row of ${paletteCount} round color swatches showing the exact palette.\n` +
    `2. "${nameU} EXPRESSIONS" row: six head-and-shoulders portraits in a row, same character, ` +
    `labeled under each one: ${expr.join(', ')}.\n` +
    `3. Bottom-left "${nameU} TURNAROUND": four full-body views in a row, labeled: ` +
    `Front View, Side View, Back View, 3/4 View.\n` +
    `4. Bottom-right "${nameU} ACTION POSES": three dynamic full-body poses — ` +
    `(a) ${acts[0]}, (b) ${acts[1]}, (c) ${acts[2]}.\n` +
    `\n` +
    `CONSISTENCY RULES: the exact same character in every frame — same face, same colors, ` +
    `same proportions. Clean solid yellow background everywhere. Small neat capital-letter labels ` +
    `under each frame. No other characters, no scenery, no photo background, no garbled text.`
  );
}
