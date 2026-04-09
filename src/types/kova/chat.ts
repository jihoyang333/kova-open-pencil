export interface ChatConversation {
  readonly id: string
  readonly user_id: string
  readonly brand_id: string
  readonly canvas_id: string
  readonly title: string | null
  readonly created_at: string
  readonly updated_at: string
}

export interface ChatMessageAttachment {
  readonly type: 'media' | 'chat-attachment'
  readonly id: string
  readonly file_name: string
  readonly url: string
  readonly width: number | null
  readonly height: number | null
}

export interface ChatMessage {
  readonly id: string
  readonly conversation_id: string
  readonly user_id: string
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly attachments: readonly ChatMessageAttachment[]
  readonly tool_calls: readonly Record<string, unknown>[]
  readonly created_at: string
}
