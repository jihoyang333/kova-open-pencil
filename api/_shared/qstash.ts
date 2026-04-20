import { Client } from '@upstash/qstash'

type QStashClientLike = Pick<Client, 'publishJSON'>

export async function publishToQStash(
  url: string,
  body: unknown,
  client?: QStashClientLike,
): Promise<void> {
  if (client) {
    await client.publishJSON({ url, body })
    return
  }
  const token = process.env.QSTASH_TOKEN
  if (!token) throw new Error('QSTASH_TOKEN not configured')
  await new Client({ token }).publishJSON({ url, body })
}
