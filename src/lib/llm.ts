/**
 * Axiom LLM provider wrapper — OpenAI-compatible /chat/completions only.
 *
 * Ray 2026-10-03: xAI 不再使用。所有 LLM 呼叫只經由此 wrapper。
 * 每日 ingest 跑 AXIOM_LLM_PROVIDER=none（抽取式 digest＋免費翻譯保底）；
 * 正式雙語改寫由維護者（Bebo）另行處理。
 *
 * Env:
 *   AXIOM_LLM_PROVIDER  provider 名稱；`none` = 強制不呼叫 LLM
 *   AXIOM_LLM_BASE_URL  OpenAI 相容 base URL（不可含 x.ai，否則直接 throw）
 *   AXIOM_LLM_MODEL     model 名稱
 *   AXIOM_LLM_API_KEY   key —— 只從 env 讀，絕不寫進 repo／文件／log
 */

export interface LlmConfig {
  provider: string;
  baseUrl: string;
  model: string;
  key: string;
}

export function getLlmConfig(): LlmConfig | null {
  const provider = (process.env.AXIOM_LLM_PROVIDER || "").trim().toLowerCase();
  if (provider === "none") {
    console.info("[llm] provider=none — LLM disabled by operator");
    return null;
  }

  const baseUrl = (process.env.AXIOM_LLM_BASE_URL || "").replace(/\/$/, "");
  const model = (process.env.AXIOM_LLM_MODEL || "").trim();
  const key = process.env.AXIOM_LLM_API_KEY || "";

  // 沒有明確設定 base URL＋model，就不呼叫任何 LLM（不再有預設值）
  if (!baseUrl || !model) return null;

  // Guard: 絕不允許 xAI（Ray 明令）
  if (baseUrl.includes("x.ai")) {
    throw new Error(
      "[llm] REFUSED: baseUrl contains x.ai — xAI is banned by operator policy"
    );
  }
  if (provider.includes("xai") || provider.includes("grok")) {
    throw new Error(
      "[llm] REFUSED: provider looks like xAI — banned by operator policy"
    );
  }

  return { provider: provider || "custom", baseUrl, model, key };
}

export async function chatJson(
  cfg: LlmConfig,
  messages: Array<{ role: string; content: string }>,
  opts?: { temperature?: number }
): Promise<unknown | null> {
  async function call(withJsonFormat: boolean) {
    const body: Record<string, unknown> = {
      model: cfg.model,
      temperature: opts?.temperature ?? 0.2,
      messages,
    };
    if (withJsonFormat) body.response_format = { type: "json_object" };
    return fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  try {
    let res = await call(true);
    if (!res.ok) {
      const errText = await res.text().then((t) => t.slice(0, 200));
      console.warn("[llm] HTTP", res.status, errText.slice(0, 120));
      // 部分免費模型不支援 response_format：400 時不帶重試（保留舊邏輯）
      if (res.status === 400 || /response_format|json_object/i.test(errText)) {
        res = await call(false);
      } else {
        return null;
      }
    }
    if (!res.ok) {
      console.warn("[llm] retry HTTP", res.status);
      return null;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    // 容錯：先整段 parse，失敗再從文字中擷取 JSON（免費模型常夾雜說明文字）
    try {
      return JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          return JSON.parse(m[0]);
        } catch {
          return null;
        }
      }
      return null;
    }
  } catch (err) {
    console.warn("[llm] failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
