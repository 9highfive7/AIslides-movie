/** OpenAI互換のChat Completions APIクライアント (台本生成用) */
export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export const resolveLlmConfig = (): LlmConfig => {
  const apiKey = process.env.OPENAI_API_KEY ?? '';
  if (!apiKey) {
    throw new Error(
      '環境変数 OPENAI_API_KEY を設定してください。\n' +
        'OpenAI互換のエンドポイント (Ollama など) を使う場合は OPENAI_BASE_URL・SCRIPT_MODEL も指定できます。',
    );
  }
  const baseUrl = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = process.env.SCRIPT_MODEL ?? 'gpt-4o-mini';
  return { baseUrl, apiKey, model };
};

export const chatJson = async (cfg: LlmConfig, system: string, user: string): Promise<string> => {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `LLM API が失敗しました: HTTP ${res.status} ${body.slice(0, 300)}\n` +
        `(endpoint: ${cfg.baseUrl}, model: ${cfg.model})`,
    );
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('LLM API の応答に内容がありません。');
  }
  return content;
};

/** 応答からJSON部分を取り出す (コードフェンスが付いていても許容) */
export const extractJson = (raw: string): unknown => {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(trimmed) as unknown;
};
