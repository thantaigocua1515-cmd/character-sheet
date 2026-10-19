# Character Model Sheet — Prompt Template

Dùng cho web tạo ảnh model sheet kiểu ảnh mẫu (Squirrel/Panda).
Model đề xuất: Gemini `gemini-3.1-flash-image` (Nano Banana 2) qua `generateContent`.
Mỗi nhân vật = 1 ảnh riêng (không gộp 2 nhân vật vào 1 prompt).

---

## 1. FILLED EXAMPLE (Squirrel — khớp ảnh mẫu)

```
Create a character model sheet for an animated movie, single image, bright solid yellow background.

STYLE: 3D cartoon, Pixar-like family animation style, soft studio lighting, smooth fur,
clean shapes, vibrant colors. Not photorealistic.

CHARACTER
- Name (big bold cartoon title at top of sheet): SQUIRREL
- Species: red squirrel, young adult
- Role: Main Character
- Personality: energetic, clever, playful, brave
- Traits: quick, curious, determined
- Exact color palette: burnt orange fur #B85C2B, light cream belly #F6E7D3,
  pink inner ears #F0A6B8, dark brown outlines #2A1E14, green eyes #3E8E41,
  fluffy tail with darker tip #8A3E1C

LAYOUT — one sheet, clearly separated labeled sections:
1. TOP HEADER: large 3D cartoon title "SQUIRREL" at top-left. Center: one big
   full-body hero pose, standing confidently with hands on hips, big fluffy tail
   raised behind. Beside the pose: a clean info panel with the text lines
   "Role: Main Character", "Personality: Energetic, Clever, Playful, Brave",
   "Traits: Quick, Curious, Determined", "Species: Squirrel",
   "Age: Young (Adult)", and below it a horizontal row of 6 round color swatches
   showing the exact palette.
2. "SQUIRREL EXPRESSIONS" row: six head-and-shoulders portraits in a row, same
   character, labeled under each one: Happy, Curious, Surprised, Mischievous,
   Angry, Confident.
3. Bottom-left "SQUIRREL TURNAROUND": four full-body views in a row, labeled:
   Front View, Side View, Back View, 3/4 View.
4. Bottom-right "SQUIRREL ACTION POSES": three dynamic full-body poses —
   (a) running fast holding a green bamboo stick,
   (b) jumping mid-air with arms raised cheering,
   (c) crouching low ready to pounce.

CONSISTENCY RULES: the exact same character in every frame — same face, same fur
colors, same proportions, same tail shape. Clean solid yellow background everywhere.
Small neat capital-letter labels under each frame. No other characters, no scenery,
no photo background, no garbled text.
```

## 2. TEMPLATE (web app ghép từ form)

```
Create a character model sheet for an animated movie, single image, bright solid
yellow background.

STYLE: 3D cartoon, {{art_style}}, soft studio lighting, smooth {{fur_or_skin}},
clean shapes, vibrant colors. Not photorealistic.

CHARACTER
- Name (big bold cartoon title at top of sheet): {{name_upper}}
- Species: {{species}}, {{age}}
- Role: {{role}}
- Personality: {{personality}}
- Traits: {{traits}}
- Exact color palette: {{palette_with_hex}}

LAYOUT — one sheet, clearly separated labeled sections:
1. TOP HEADER: large 3D cartoon title "{{name_upper}}" at top-left. Center: one big
   full-body hero pose, {{hero_pose}}. Beside the pose: a clean info panel with the
   text lines "Role: {{role}}", "Personality: {{personality}}",
   "Traits: {{traits}}", "Species: {{species}}", "Age: {{age}}", and below it a
   horizontal row of {{palette_count}} round color swatches showing the exact palette.
2. "{{name_upper}} EXPRESSIONS" row: six head-and-shoulders portraits in a row, same
   character, labeled under each one: {{expr_1}}, {{expr_2}}, {{expr_3}},
   {{expr_4}}, {{expr_5}}, {{expr_6}}.
3. Bottom-left "{{name_upper}} TURNAROUND": four full-body views in a row, labeled:
   Front View, Side View, Back View, 3/4 View.
4. Bottom-right "{{name_upper}} ACTION POSES": three dynamic full-body poses —
   (a) {{action_1}}, (b) {{action_2}}, (c) {{action_3}}.

CONSISTENCY RULES: the exact same character in every frame — same face, same colors,
same proportions. Clean solid yellow background everywhere. Small neat capital-letter
labels under each frame. No other characters, no scenery, no photo background,
no garbled text.
```

Mặc định expressions: Happy, Curious, Surprised, Mischievous, Angry, Confident.
Mặc định art_style: "Pixar-like family animation style".

## 3. TIPS

- Mỗi nhân vật 1 prompt / 1 ảnh riêng — gộp 2 nhân vật dễ bị lẫn design.
- Luôn khóa palette bằng mã HEX cụ thể, không ghi "màu cam" chung chung.
- Giữ nguyên species + age + art_style qua mọi lần generate để đồng nhất cho video AI.
- Nếu label chữ bị sai chính tả: generate lại, hoặc bỏ hẳn phần label (bản làm ref cho
  video AI không cần chữ).
- Muốn nền khác: đổi "bright solid yellow background" ở 2 chỗ (dòng đầu + consistency rules).
