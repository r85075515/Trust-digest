# 提案：Axiom 永久部署 — GitHub Actions＋GitHub Pages（全免費）

狀態：**提案待 CoS 批准，未實作**。撰寫：Bebo，2026-10-03。
分支策略、批准後才動手；每日排程等部署定案後再恢復。

## 現況

- 每日排程「Axiom 日更」自 2026-09-30 起暫停；之前在 box 上跑 `next start`＋tunnelmole 臨時 tunnel（URL 會變、常斷線）。
- 目前無永久部署；box 上仍有舊 build 在跑（無 tunnel）。

## 方案

GitHub Actions＋GitHub Pages，全免費，無需伺服器。

### 需改的程式（共 2 處，已驗證可行）

1. `next.config.ts` 加 `output: 'export'`（靜態匯出）。
2. `src/app/story/[id]/page.tsx` 加 `generateStaticParams`（目前缺；build 顯示 `/story/[id]` 為 dynamic ƒ）。
3. 相容性已確認：無 API routes、無 `next/image`（lint 只有 `<img>` warnings，不影響 export）。

### 每日流程

```
01:32 UTC  Actions `ingest.yml`
             ├─ AXIOM_LLM_PROVIDER=none npm run ingest
             │    （抽取式 digest＋Google Translate 保底，零 LLM 成本）
             └─ commit data/stories.json、data/ingest-meta.json、public/covers/live/
                    ↓
~02:00 UTC  Bebo cron：把當天卡片改寫成正式雙語 digest＋glossary
             （譯名（Original）格式），commit 回 repo
                    ↓
            Actions `deploy.yml`（push 觸發）
             ├─ npm run build（靜態匯出）
             └─ 部署到 GitHub Pages
```

### 為什麼這樣切

- ingest（抓 RSS／分群／trust／挑卡）是機器活，適合 Actions 排程。
- 雙語改寫是 Bebo 用自己 token 做的事（Ray 拍板：免費、不接外部 LLM API），放 cron。
- 兩步都經 git commit，`deploy.yml` 只在 push 時 build＋部署，職責乾淨。

## 待 CoS 決定

1. **批准此方案**（或提替代）。
2. **分支策略**：繼續 `feat/mvp` 還是開 `main`（push 前確認；Bebo 用已連接的 `r85075515` 帳號 push）。
3. Pages 的自訂網域要不要（先用 `*.github.io` 即可，零成本）。
4. 舊 box 上的 `next start` 何時關（部署上線後）。
5. `data/stories.json` 整檔覆写 vs 30 天累積（已知 bug #11）：第一版先維持整檔覆寫，累積留待後續。

## 不做的事

- 在批准前不實作、不 push、不恢復每日排程。
- 不碰 AdSense／改名（backlog 明示暫緩）。
