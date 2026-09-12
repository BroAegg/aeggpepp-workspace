# AeggPepp Workspace — Grand Development Discussion & Roadmap

> **Tanggal**: 13 September 2026  
> **Participants**: Aegg (Fullstack Engineer) + Antigravity AI  
> **Status**: Discussion / Awaiting Approval

---

## 📋 Agenda Overview

| # | Topik | Status |
|---|-------|--------|
| 1 | Cleanup File yang Tidak Diperlukan | ✅ Analyzed |
| 2 | 9Router untuk Vibe Coding | ⚠️ Perlu Klarifikasi |
| 3 | Free AI Coding Agents | 💡 Insight Provided |
| 4 | Telegram Receipt Scanner → Finance (N8N) | 🔥 Plan Ready |
| 5 | AI Financial Advisor & Spending Health | 🔥 Plan Ready |
| 6 | Overall Project Masukan & Saran | 💡 Insight Provided |

---

## 1️⃣ File Cleanup — Hapus yang Tidak Diperlukan

### Analisis File di Root Project

| File | Status | Alasan |
|------|--------|--------|
| `fix-database.sql` | 🗑️ **Hapus** | One-time fix, sudah dijalankan |
| `migration-activity-log.sql` | 🗑️ **Hapus** | Migration sudah applied di Supabase |
| `migration-custom-categories.sql` | 🗑️ **Hapus** | Migration sudah applied |
| `migration-goals-v2.sql` | 🗑️ **Hapus** | Migration sudah applied |
| `migration-v2.sql` | 🗑️ **Hapus** | Migration sudah applied |
| `migration.sql` | 🗑️ **Hapus** | Migration sudah applied |
| `setup-avatar-storage.sql` | 🗑️ **Hapus** | Setup sudah dijalankan |
| `setup-receipts-storage.sql` | ⚡ **Keep** | Mungkin diperlukan untuk fitur receipt scanner baru |
| `supabase-schema.sql` | ✅ **Keep** | Master schema reference |
| `.env.local.example` | ⚠️ **FIX SECURITY** | Contains actual Supabase credentials! Replace with placeholders |
| `tsconfig.tsbuildinfo` | 🗑️ **Hapus** | Auto-generated build cache, di-recreate saat build |

### Rekomendasi
- Pindahkan `.sql` files ke `migrations/` folder jika ingin keep sebagai history
- Atau commit terakhir kali lalu hapus dari working directory
- **URGENT**: Fix `.env.local.example` — hapus real credentials, ganti placeholder

---

## 2️⃣ 9Router untuk Vibe Coding

> ✅ **Confirmed & Cloned ke `D:\Peppakuu\Our Project\9Router`**  
> Source: [github.com/decolua/9router](https://github.com/decolua/9router) | Website: [9router.com](https://9router.com)

### Apa itu 9Router?
**9Router** adalah FREE AI Router & Token Saver khusus untuk vibe coding dan coding agents:
1. **RTK Token Saver**: Mengompres output tool_result (git diff, grep, ls, log) dan menghemat 20-40% token per request.
2. **Auto-Fallback Tanpa Henti**: Jika subscription/rate limit habis (Tier 1: Claude Code/Copilot), otomatis fallback ke model murah (Tier 2: GLM, MiniMax) lalu model gratis (Tier 3: Kiro AI, OpenCode Free, Vertex AI).
3. **Multi-Account & Quota Tracking**: Round-robin akun AI, lacak sisa kuota dan reset time agar tidak ada kuota langganan yang hangus percuma.
4. **Universal Compatibility**: Kompatibel dengan semua tool vibe coding (Antigravity, Cursor, Claude Code, Codex, Cline, OpenClaw, Continue, Roo, dll).

### Status Instalasi:
- **Path**: `D:\Peppakuu\Our Project\9Router`
- **Port Dashboard**: `http://localhost:20127` atau `http://localhost:20128`
- **OpenAI-compatible Endpoint**: `http://localhost:20128/v1` (atau port yang aktif)
- **Dependencies**: `npm install` sedang diselesaikan di folder tersebut.

---

## 3️⃣ Free AI Coding Agents — Landscape 2026

### Tier 1: Best Free Options

| Agent | Platform | Free Tier | Kelebihan |
|-------|----------|-----------|-----------|
| **Google Antigravity** | VS Code Extension | ✅ Generous | Deep codebase understanding, planning |
| **GitHub Copilot** | VS Code/JetBrains | ✅ Free personal | Inline autocomplete, chat |
| **Cursor** | Standalone IDE | ⚡ Limited free | Tab completion, composer |
| **Cline** | VS Code Extension | ✅ BYOK | Autonomous coding |
| **Aider** | Terminal CLI | ✅ Open source | Git-aware editing |

### Tier 2: Powerful Alternatives

| Agent | Platform | Kelebihan |
|-------|----------|-----------|
| **Continue.dev** | VS Code | Modular, any model |
| **Windsurf (Codeium)** | Standalone IDE | Fast autocomplete |
| **Roo Code** | VS Code | Multi-mode agents |
| **Qwen Coder** | Various | Great local model |

### Rekomendasi Setup

```
1. PRIMARY: Antigravity — planning & complex tasks
2. SECONDARY: GitHub Copilot Free — day-to-day autocomplete  
3. LOCAL: Ollama + Qwen Coder / DeepSeek — unlimited free usage
4. ROUTER: OpenRouter — access berbagai model
```

---

## 4️⃣ Telegram Receipt Scanner → Finance (N8N)

### Architecture

```
📱 Telegram → 🔄 N8N → 🤖 AI OCR (Gemini) → 🗄️ Supabase → 🌐 Web Dashboard
```

### Flow Detail

1. User kirim **foto struk** + caption ke Telegram Bot
2. N8N receive via **Telegram Trigger**
3. AI (Gemini) melakukan **OCR + parsing**:
   - Nama toko, daftar item, harga, total, tanggal
4. Data structured & **INSERT ke Supabase** (transactions + receipt_items)
5. **Reply confirmation** ke Telegram
6. **Real-time update** di web dashboard

### New Database Tables

```sql
-- Receipt items detail
CREATE TABLE receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(12,2),
  total_price DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Receipt images storage
CREATE TABLE receipt_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  ocr_raw_text TEXT,
  source TEXT DEFAULT 'telegram',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Required Components
- **N8N** (self-hosted, Docker/npm) — FREE
- **Telegram Bot** (via BotFather) — FREE
- **Google Gemini API** (OCR + parsing) — FREE tier
- **Supabase** (existing) — FREE tier

### Cost: **Rp 0 / bulan** 🎉

---

## 5️⃣ AI Financial Advisor & Spending Health

### Features

#### A. Spending Health Score
- Overall score 0-100
- Savings rate tracking
- Category breakdown vs benchmarks
- Month-over-month trends

#### B. Smart Alerts
- Overspending (expense > 70% income)
- No savings warning
- Category spending spikes
- Budget exceeded
- Unusual transactions
- Couple spending balance

#### C. AI Chat Advisor
- Interactive chat interface di web
- Powered by Gemini API (free)
- Context-aware (uses actual financial data)
- Personalized suggestions
- Conversation history

### New Files Needed

```
src/app/(dashboard)/finance/advisor/page.tsx     # AI Advisor page
src/components/features/finance/advisor-chat.tsx  # Chat UI
src/components/features/finance/health-score.tsx  # Health dashboard
src/components/features/finance/spending-alerts.tsx
src/components/features/finance/receipt-detail.tsx
src/lib/actions/finance-ai.ts                    # AI server actions
src/lib/actions/receipts.ts                      # Receipt CRUD
src/lib/financial-health.ts                      # Health calculator
```

---

## 6️⃣ Grand Development Roadmap

```
Phase 17: Cleanup & Foundation         [1-2 days]
├── Delete unused files
├── Fix security issues
└── Update documentation

Phase 18: Telegram Bot Setup           [3-5 days]  
├── Create bot, setup N8N
├── Basic text expense workflow
└── Telegram confirmation replies

Phase 19: Receipt OCR Scanner          [5-7 days]
├── Gemini API OCR integration
├── New DB tables
├── N8N photo workflow
├── Receipt detail view
└── Web upload alternative

Phase 20: Financial Health Engine      [3-5 days]
├── Health score calculator
├── Spending alerts
├── Category benchmarks
└── Couple analysis

Phase 21: AI Financial Advisor         [5-7 days]
├── Gemini API chat integration
├── Chat UI component
├── Streaming responses
└── Conversation history

Phase 22: Notifications & Alerts       [2-3 days]
├── Weekly summary → Telegram
├── Budget exceeded alerts
└── Monthly recap

Phase 23: Goals Notion-like Overhaul   [Per existing plan]
├── Table view, Side peek
├── Sub-pages, Rich text editor
└── (See GOALS-OVERHAUL-PLAN.md)

Estimated Total: 4-6 weeks (Phase 17-22)
```

---

## 💡 Future Ideas

- Shared budget planning for couple
- Expense splitting & tracking
- Savings goals with progress bars
- Investment tracker (saham/crypto/reksadana)
- Bill reminders via Telegram
- Export to Excel/PDF reports
- Multi-currency support

---

## Open Questions (Perlu Dijawab)

1. **9Router** — Link/sumber tentang tool ini?
2. **N8N Hosting** — Self-host (Docker) atau cloud (Railway)?
3. **AI API** — Gemini (free), OpenAI (paid), atau Ollama (local)?
4. **Telegram Bot** — Sudah punya atau bikin baru?
5. **Priority** — Mulai dari phase mana?
6. **Ramadan Feature** — Keep atau remove?

---

*Living document — will be updated as development progresses*  
*Created: 13 September 2026 | By: Aegg + Antigravity AI*
