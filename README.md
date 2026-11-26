# Streak（打卡連勝 MVP）

Vue3 + Pinia + Supabase。

## 開始
1. 到 supabase.com 建專案，把 `schema.sql` 貼到 SQL Editor 執行
2. 根目錄建立 `.env`：
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=你的 anon key
   ```
3. `npm install && npm run dev`
4. `npm test` 跑連勝邏輯測試

## 目前有的
- `schema.sql`：資料表 + 排行榜 view + RLS 權限
- `src/utils/streak.js`：連勝計算（含保護卡），已有 9 個測試
- `src/stores/challenge.js`：讀取、打卡、排行榜
- `src/App.vue`：打卡頁（暫用網址 `?p=<participation_id>` 載入）

## 下一步
- 登入（Supabase Auth，Email magic link）
- 挑戰列表 / 建立挑戰 / 加入小組（邀請碼）
- 把打卡改成 Supabase RPC，在資料庫端驗證日期，避免用戶改本機時間作弊
- 分享成果卡片、PWA、Stripe 訂閱
# streak-app
