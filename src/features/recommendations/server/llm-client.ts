import "server-only";
import { llmRecommendationsPayloadSchema, LLM_JSON_SCHEMA } from "../schema";
import type { LlmRecommendation } from "../schema";

/**
 * Minimal server-side LLM client.
 *
 * The API key is read from the server environment only and is never returned,
 * logged or exposed to the browser. If no key is configured the caller falls
 * back to deterministic ranking (see ../service.ts).
 *
 * Supported providers are the two OpenAI-/Anthropic-compatible HTTP APIs, so
 * no SDK dependency is added to the project.
 */

export type LlmProvider = "openai" | "anthropic";

export type LlmConfig = {
  provider: LlmProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
};

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
};

const DEFAULT_BASE_URLS: Record<LlmProvider, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
};

const DEFAULT_TIMEOUT_MS = 12_000;

export class LlmUnavailableError extends Error {
  constructor(
    message: string,
    readonly reason: "not-configured" | "request-failed" | "invalid-output",
  ) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

/** Reads configuration from the environment. Returns null when unconfigured. */
export function readLlmConfig(): LlmConfig | null {
  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) return null;

  const provider = (process.env.LLM_PROVIDER?.trim().toLowerCase() ?? "openai") as LlmProvider;
  if (provider !== "openai" && provider !== "anthropic") {
    console.warn(`[recommendations] Unknown LLM_PROVIDER "${provider}"; using deterministic ranking.`);
    return null;
  }

  const timeout = Number.parseInt(process.env.LLM_TIMEOUT_MS ?? "", 10);

  return {
    provider,
    model: process.env.LLM_MODEL?.trim() || DEFAULT_MODELS[provider],
    apiKey,
    baseUrl: process.env.LLM_BASE_URL?.trim().replace(/\/$/, "") || DEFAULT_BASE_URLS[provider],
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
  };
}

export function isLlmConfigured(): boolean {
  return readLlmConfig() !== null;
}

/**
 * Logs why the provider rejected a request, server-side only.
 * The body is truncated and the key is never part of it, but it is still
 * provider output, so it never reaches the HTTP response.
 */
async function logProviderError(provider: LlmProvider, response: Response): Promise<void> {
  let detail = "";
  try {
    detail = (await response.text()).slice(0, 300);
  } catch {
    // Body already consumed or unreadable; the status alone is enough.
  }
  console.warn(`[recommendations] ${provider} returned HTTP ${response.status}: ${detail}`);
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Some models wrap JSON in prose or a code fence.
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) {
      throw new LlmUnavailableError("Model did not return JSON", "invalid-output");
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

async function callOpenAi(
  config: LlmConfig,
  systemPrompt: string,
  userPrompt: string,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "campaign_recommendations", strict: true, schema: LLM_JSON_SCHEMA },
      },
    }),
    signal,
  });

  if (!response.ok) {
    await logProviderError("openai", response);
    throw new LlmUnavailableError(
      `Provider responded with HTTP ${response.status}`,
      "request-failed",
    );
  }
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new LlmUnavailableError("Empty provider response", "invalid-output");
  return content;
}

async function callAnthropic(
  config: LlmConfig,
  systemPrompt: string,
  userPrompt: string,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1024,
      // `temperature` is deliberately omitted: newer Anthropic models reject
      // it outright, and the JSON schema already constrains the output.
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `${userPrompt}\n\nRespond with JSON matching this schema:\n${JSON.stringify(
            LLM_JSON_SCHEMA,
          )}`,
        },
      ],
    }),
    signal,
  });

  if (!response.ok) {
    await logProviderError("anthropic", response);
    throw new LlmUnavailableError(
      `Provider responded with HTTP ${response.status}`,
      "request-failed",
    );
  }
  const body = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = body.content?.find((part) => part.type === "text")?.text;
  if (!text) throw new LlmUnavailableError("Empty provider response", "invalid-output");
  return text;
}

/**
 * Asks the model to rank candidates. Returns schema-valid recommendations;
 * the caller still checks every id against the candidate allow-list.
 */
export async function requestLlmRecommendations(
  systemPrompt: string,
  userPrompt: string,
): Promise<LlmRecommendation[]> {
  const config = readLlmConfig();
  if (!config) {
    throw new LlmUnavailableError("LLM_API_KEY is not configured", "not-configured");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const raw =
      config.provider === "anthropic"
        ? await callAnthropic(config, systemPrompt, userPrompt, controller.signal)
        : await callOpenAi(config, systemPrompt, userPrompt, controller.signal);

    const parsed = llmRecommendationsPayloadSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
      throw new LlmUnavailableError("Model output failed validation", "invalid-output");
    }
    return parsed.data.recommendations;
  } catch (error) {
    if (error instanceof LlmUnavailableError) throw error;
    // Never surface provider errors verbatim: they can echo the request.
    const reason = controller.signal.aborted ? "timed out" : "request failed";
    throw new LlmUnavailableError(`LLM ${reason}`, "request-failed");
  } finally {
    clearTimeout(timer);
  }
}
