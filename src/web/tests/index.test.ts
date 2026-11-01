import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Index from '../src/pages/index.astro'

const healthy = () =>
  new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

const render = async (locals: App.Locals = {}) => {
  const container = await AstroContainer.create()
  return container.renderToString(Index, { locals })
}

describe('home page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('queries the CMS health endpoint', async () => {
    const fetchMock = vi.fn(async () => healthy())
    vi.stubGlobal('fetch', fetchMock)

    await render()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0]![0]).toBe('http://localhost:3000/api/health')
  })

  it('reports a connected CMS', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => healthy()))

    expect(await render()).toContain('Connected — the CMS reached its database.')
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

  it('shows who is logged in, with a way to log out', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => healthy()))

    const html = await render({ user: { name: 'Kari Nordmann' } as App.Locals['user'] })

    expect(html).toContain('Logget inn som Kari Nordmann')
    expect(html).toContain('action="/logg-ut"')
  })
})
