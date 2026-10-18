/**
 * Claude (Anthropic API) で台本を書く。公式 SDK (@anthropic-ai/sdk) を使う。
 *
 * 認証は SDK の既定の順で解決する: ANTHROPIC_API_KEY → ANTHROPIC_AUTH_TOKEN → `ant auth login` のプロファイル。
 * モデルは CLAUDE_MODEL で変えられる (既定 claude-opus-5-5)。
 */
import Anthropic from '@anthropic-ai/sdk';

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-5-5';

/** 環境変数で Claude の認証情報が渡されているか (プロファイル認証は実際に呼ぶまで分からない) */
export const hasClaudeEnvCredentials = (): boolean =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let client: Anthropic | null = null;

/** system + user を渡し、応答のテキスト (JSON を期待) を返す */
export const claudeText = async (system: string, user: string): Promise<string> => {
  client ??= new Anthropic();
  // 台本は長くなることがあるので、ストリーミングで受けて最後にまとめて取り出す。
  // 安全性の判定で断られたときは、サーバー側で別のモデルに引き継ぐ (fallbacks: "default")
  const stream = client.beta.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high' },
    system,
    messages: [{ role: 'user', content: user }],
  });
  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await stream.finalMessage();
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new Error('Claude の APIキーが正しくありません。ANTHROPIC_API_KEY を確認してください。');
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new Error('Claude の利用上限に達しました。しばらく待ってから試してください。');
    }
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Claude の呼び出しに失敗しました (HTTP ${error.status}): ${error.message}`);
    }
    // APIキーが見つからないときなどは、HTTP の前にここへ来る
    throw new Error(
      `Claude を呼び出せませんでした: ${error instanceof Error ? error.message : String(error)}\n` +
        'ANTHROPIC_API_KEY を設定するか、`ant auth login` でログインしてください。',
    );
  }
  if (message.stop_reason === 'refusal') {
    throw new Error('Claude がこの依頼への回答を断りました。テーマや設定の書き方を変えて試してください。');
  }
  if (message.stop_reason === 'max_tokens') {
    throw new Error('台本が長すぎて途中で切れました。尺を短くするか、設定を絞ってください。');
  }
  const text = message.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
  if (!text.trim()) {
    throw new Error('Claude の応答に台本が含まれていませんでした。');
  }
  return text;
};
