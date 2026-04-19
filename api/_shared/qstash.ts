import { Client } from '@upstash/qstash'

const client = new Client({ token: process.env.QSTASH_TOKEN! })

export async function publishToQStash(url: string, body: unknown): Promise<void> {
  await client.publishJSON({ url, body })
}
