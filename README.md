# 🎨 Character Sheet Studio

Web tạo ảnh **character model sheet** (kiểu ảnh mẫu Squirrel/Panda) bằng Gemini,
lưu trữ theo tài khoản trên Supabase. Mỗi nhân vật 1 ảnh riêng, gallery xem lại,
chuẩn bị cho giai đoạn 2: tạo video từ ảnh bằng Veo.

## 1. Tạo Supabase project mới

1. Vào [supabase.com](https://supabase.com) → **New project**, đặt tên vd `character-sheet-studio`.
2. Đợi project khởi tạo xong → vào **SQL Editor** → **New query**.
3. Copy toàn bộ nội dung file `supabase/schema.sql` → **Run**.
   (Tạo 4 bảng `user_api_keys`, `cs_characters`, `cs_sheets`, `cs_videos`
   + 2 bucket private `cs-sheets`, `cs-videos` + RLS policies.)
4. **Authentication** → **Providers** → đảm bảo **Email** đang bật (mặc định bật).

## 2. Lấy thông tin kết nối

**Project Settings** → **API** → copy:
- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` key → `VITE_SUPABASE_ANON_KEY`

## 3. Chạy local

```bash
cd character-sheet
cp .env.example .env   # rồi điền 2 giá trị ở bước 2
npm install
npm run dev
```

Mở URL hiện ra (thường `http://localhost:5173`).

## 4. Dùng app

1. **Đăng ký** tài khoản ngay trong app (tab đầu tiên).
2. Vào tab **🔑 API Keys** → thêm Gemini API key
   ([lấy key ở đây](https://aistudio.google.com/apikey)). Có thể thêm nhiều key,
   app tự xoay vòng khi key lỗi/quota.
3. Tab **🧍 Nhân vật** → kiểm tra/sửa 2 nhân vật mẫu (Squirrel/Panda theo đúng
   ảnh mẫu bạn gửi) → **Lưu 2 nhân vật**.
4. Tab **✨ Tạo ảnh** → bấm tạo từng nhân vật hoặc cả 2. Ảnh tự upload lên
   Supabase Storage + ghi record.
5. Tab **🖼️ Gallery** → xem lại, xem full, tải về, xóa.

## 5. Deploy Vercel

1. Push thư mục này lên GitHub repo mới (vd `thantaigocua1515-cmd/character-sheet`).
2. Vercel → **Import** repo → thêm 2 Environment Variables:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → **Deploy**.

## Giai đoạn 2 (video)

Tab **🎬 Video** đang để placeholder. Bảng `cs_videos` + bucket `cs-videos`
đã có sẵn — khi làm sẽ: chọn ảnh trong Gallery → nhập motion prompt →
gọi Veo image-to-video bằng Gemini key của tài khoản → poll operation → lưu mp4.

## Lưu ý

- Frontend chỉ dùng **anon key** + RLS — không bao giờ nhúng `service_role` key.
- API key Gemini lưu trong DB, RLS khóa theo từng tài khoản (`auth.uid()`).
