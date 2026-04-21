import { ref } from 'vue'

const pendingMessage = ref<string | null>(null)

export function useChatCommands() {
  function sendToChat(text: string) {
    pendingMessage.value = text
  }

  function consumePendingMessage(): string | null {
    const msg = pendingMessage.value
    pendingMessage.value = null
    return msg
  }

  return { pendingMessage, sendToChat, consumePendingMessage }
}
