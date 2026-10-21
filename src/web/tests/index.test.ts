import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Index from '../src/pages/index.astro'

const paginated = (totalDocs: number) =>
  new Response(
    JSON.stringify({
      docs: [],
      totalDocs,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )

const render = async () => {
  const container = await AstroContainer.create()
  return container.renderToString(Index)
}

describe('home page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('queries the CMS media collection', async () => {
    const fetchMock = vi.fn(async () => paginated(0))
    vi.stubGlobal('fetch', fetchMock)

    await render()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0]![0]).toBe('http://localhost:3000/api/media?limit=0')
  })

  it('reports the document count the CMS returns', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => paginated(3)))

    expect(await render()).toContain('Connected — 3 document(s)')
  })

  it('reports an unreachable CMS instead of failing the render', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500, statusText: 'Internal Server Error' })),
    )

    const html = await render()

    expect(html).toContain('Not reachable')
    expect(html).toContain('500')
  })
})
