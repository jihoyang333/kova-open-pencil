import { describe, expect, test } from 'bun:test'

import { createAnthropic } from '@ai-sdk/anthropic'

import {
  ANTHROPIC_PROXY_BASE_URL,
  ANTHROPIC_PROXY_PLACEHOLDER_API_KEY,
} from '@/composables/use-chat'

interface AnthropicLanguageModelInternal {
  config: { headers: () => Record<string, string> }
}

function withCleanEnv<T>(fn: () => T): T {
  const original = process.env.ANTHROPIC_API_KEY
  delete process.env.ANTHROPIC_API_KEY
  try {
    return fn()
  } finally {
    if (original !== undefined) process.env.ANTHROPIC_API_KEY = original
  }
}

describe('Anthropic proxy SDK contract', () => {
  test('exports a non-empty placeholder apiKey', () => {
    expect(ANTHROPIC_PROXY_PLACEHOLDER_API_KEY).toBeTruthy()
    expect(ANTHROPIC_PROXY_PLACEHOLDER_API_KEY.length).toBeGreaterThan(0)
  })

  test('createAnthropic without apiKey throws AI_LoadAPIKeyError when env is unset (regression scaffold)', () => {
    withCleanEnv(() => {
      const provider = createAnthropic({ baseURL: '/api/ai-proxy' })
      const model = provider('claude-sonnet-4-6') as unknown as AnthropicLanguageModelInternal
      expect(() => model.config.headers()).toThrow(/Anthropic API key is missing/)
    })
  })

  test('createAnthropic with the placeholder produces an x-api-key header without env access', () => {
    withCleanEnv(() => {
      const provider = createAnthropic({
        apiKey: ANTHROPIC_PROXY_PLACEHOLDER_API_KEY,
        baseURL: ANTHROPIC_PROXY_BASE_URL,
        fetch: async () => new Response('{}'),
      })
      const model = provider('claude-sonnet-4-6') as unknown as AnthropicLanguageModelInternal
      const headers = model.config.headers()
      expect(headers['x-api-key']).toBe(ANTHROPIC_PROXY_PLACEHOLDER_API_KEY)
    })
  })

  test('proxy baseURL ends with /v1 so SDK-appended /messages resolves to the registered route', () => {
    expect(ANTHROPIC_PROXY_BASE_URL).toBe('/api/ai-proxy/v1')
  })
})
