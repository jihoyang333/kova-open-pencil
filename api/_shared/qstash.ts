import { Client } from '@upstash/qstash'

type QStashClientLike = Pick<Client, 'publishJSON'>

export async function publishToQStash(
  url: string,
  body: unknown,
  client?: QStashClientLike,
): Promise<void> {
  const c = client ?? new Client({ token: process.env.QSTASH_TOKEN! })
  await c.publishJSON({ url, body })
}
