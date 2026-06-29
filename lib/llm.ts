/**
 * LLM Client
 *
 * Port for the LLM service. Wraps the OpenAI-compatible chat completions API.
 * The mock LLM runs as a Docker container at LLM_BASE_URL.
 *
 * This is the only file that knows how to talk to the LLM service.
 * Swap the implementation here to change providers — nothing else changes.
 *
 * Schema enforcement:
 *   Real providers (OpenAI, Anthropic) support response_format for structured
 *   output. The mock LLM does not — so we inject the schema into the system
 *   prompt instead. When swapping providers, only this file changes.
 */

import { logger } from "@/lib/logger"

const LLM_BASE_URL = process.env.LLM_BASE_URL || "http://localhost:11434"
const TIMEOUT_MS = 5000

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface LlmResponse {
  content: string
  model: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ChatCompletionOptions {
  model?: string
  temperature?: number
  schema?: Record<string, unknown>
}

interface OpenAiResponse {
  model: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

function injectSchemaIntoPrompt(
  messages: ChatMessage[],
  schema: Record<string, unknown>
): ChatMessage[] {
  return messages.map((message) => {
    if (message.role !== "system") return message
    return {
      ...message,
      content: `${message.content}\nRespond with a JSON object matching exactly this schema: ${JSON.stringify(schema)}`,
    }
  })
}

/**
 * Send a chat completion request to the LLM service.
 *
 * @param messages - Array of chat messages (system + user)
 * @param options  - Optional: model name, temperature, JSON schema contract
 * @returns        - The parsed LLM response
 * @throws         - On network error, timeout, or invalid response shape
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: ChatCompletionOptions
): Promise<LlmResponse> {
  const resolvedMessages =
    options?.schema
      ? injectSchemaIntoPrompt(messages, options.schema)
      : messages

  const model = options?.model ?? "mock-llm-v1"
  const startTime = Date.now()

  const userMessage = messages.at(-1)?.content ?? ""

  logger.info("llm.request", {
    model,
    messageCount: resolvedMessages.length,
    promptPreview: userMessage.slice(0, 200),
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: resolvedMessages,
        model,
        temperature: options?.temperature ?? 0.2,
      }),
      signal: controller.signal,
    })
  } catch (err) {
    const durationMs = Date.now() - startTime
    if (err instanceof Error && err.name === "AbortError") {
      logger.error("llm.timeout", { model, durationMs, timeoutMs: TIMEOUT_MS })
      throw new Error(`LLM service timed out after ${TIMEOUT_MS}ms`)
    }
    logger.error("llm.unreachable", {
      model,
      durationMs,
      error: err instanceof Error ? err.message : String(err),
    })
    throw new Error(`LLM service is unreachable`, { cause: err })
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const durationMs = Date.now() - startTime
    logger.error("llm.http_error", {
      model,
      durationMs,
      status: response.status,
      statusText: response.statusText,
    })
    throw new Error(
      `LLM service returned HTTP ${response.status}: ${response.statusText}`
    )
  }

  let json: OpenAiResponse
  try {
    json = await response.json()
  } catch (err) {
    const durationMs = Date.now() - startTime
    logger.error("llm.invalid_json", {
      model,
      durationMs,
      error: err instanceof Error ? err.message : String(err),
    })
    throw new Error(`LLM service returned invalid JSON`, { cause: err })
  }

  const content = json?.choices?.[0]?.message?.content
  if (typeof content !== "string") {
    const durationMs = Date.now() - startTime
    logger.error("llm.missing_content", { model, durationMs })
    throw new Error(`LLM response missing expected content field`)
  }

  const durationMs = Date.now() - startTime

  logger.info("llm.response", {
    model: json.model,
    durationMs,
    promptTokens: json.usage.prompt_tokens,
    completionTokens: json.usage.completion_tokens,
    totalTokens: json.usage.total_tokens,
    responsePreview: content.slice(0, 200),
  })

  return {
    content,
    model: json.model,
    usage: json.usage,
  }
}