export * from './payload-types'

const CMS_URL = import.meta.env?.PUBLIC_CMS_URL ?? process.env.PUBLIC_CMS_URL ?? 'http://localhost:3000'

export type PaginatedDocs<T> = {
  docs: T[]
  totalDocs: number
  page: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/** Thin wrapper around the Payload REST API. */
export async function cmsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${CMS_URL}/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!res.ok) {
    throw new Error(`CMS ${res.status} ${res.statusText} on ${path}`)
  }

  return (await res.json()) as T
}

/** Fetch a page of documents from a collection, e.g. find('users', 'limit=10'). */
export function find<T>(collection: string, query = ''): Promise<PaginatedDocs<T>> {
  return cmsFetch<PaginatedDocs<T>>(`/${collection}${query ? `?${query}` : ''}`)
}
