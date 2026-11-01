import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import LoggInn from '../src/pages/logg-inn.astro'

const providers = (list: unknown[]) => Response.json({ providers: list })

const render = async (path: string, init?: RequestInit) => {
  const container = await AstroContainer.create()
  return container.renderToResponse(LoggInn, {
    request: new Request(new URL(path, 'http://localhost:4321'), init),
  })
}

const postLogin = (path: string) =>
  render(path, {
    method: 'POST',
    body: new URLSearchParams({ email: 'kari@digdir.no', password: 'hemmelig' }),
  })

describe('login page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('offers Entra ID, coming back to where the user was going (NF-02)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => providers([{ id: 'entra', label: 'Entra ID' }])))

    const html = await (await render('/logg-inn?redirect=%2Fteam')).text()

    expect(html).toContain('Logg inn med Entra ID')
    expect(html).toContain(
      'http://localhost:3000/api/brukere/oauth/entra/login?redirect=http%3A%2F%2Flocalhost%3A4321%2Fteam',
    )
  })

  it('still offers email and password when the CMS has no providers (NF-12)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => providers([])))

    const html = await (await render('/logg-inn')).text()

    expect(html).not.toContain('Entra ID')
    expect(html).toContain('type="password"')
  })

  it('passes the session cookie on after a password login', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({}, { headers: { 'Set-Cookie': 'payload-token=abc; Path=/; HttpOnly' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const res = await postLogin('/logg-inn?redirect=%2Fteam')

    expect(fetchMock.mock.calls[0]![0]).toBe('http://localhost:3000/api/brukere/login')
    expect(res.status).toBe(303)
    expect(res.headers.get('Location')).toBe('/team')
    expect(res.headers.getSetCookie()).toEqual(['payload-token=abc; Path=/; HttpOnly'])
  })

  it('only redirects within the site', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({}, { headers: { 'Set-Cookie': 'payload-token=abc' } })))

    for (const target of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '\\/evil.example',
      // Browsers drop tabs and newlines, which turns these into //evil.example.
      '/\t/evil.example',
      '/\n/evil.example',
      '/\r\n/evil.example',
      ' //evil.example',
      'javascript:alert(1)',
    ]) {
      const res = await postLogin(`/logg-inn?redirect=${encodeURIComponent(target)}`)
      expect(res.headers.get('Location'), JSON.stringify(target)).toBe('/')
    }
  })

  it('keeps the path, query and fragment of a target on the site', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({}, { headers: { 'Set-Cookie': 'payload-token=abc' } })))

    for (const [target, location] of [
      ['/team?vis=alle#ledere', '/team?vis=alle#ledere'],
      ['http://localhost:4321/folk', '/folk'],
      ['/a/../b', '/b'],
    ]) {
      const res = await postLogin(`/logg-inn?redirect=${encodeURIComponent(target!)}`)
      expect(res.headers.get('Location')).toBe(location)
    }
  })

  it('says so when the password is wrong', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/login') ? Response.json({}, { status: 401 }) : providers([]),
      ),
    )

    const res = await postLogin('/logg-inn')

    expect(res.status).toBe(401)
    expect(await res.text()).toContain('Feil e-post eller passord')
  })
})
