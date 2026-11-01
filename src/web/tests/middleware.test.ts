import { afterEach, describe, expect, it, vi } from 'vitest'

import { onRequest } from '../src/middleware'

// NF-11: no page without a logged-in user.

const user = { id: 1, email: 'kari@digdir.no', firstName: 'Kari', lastName: 'Nordmann' }

const run = async (path: string, cookie?: string) => {
  const url = new URL(path, 'http://localhost:4321')
  const context = {
    url,
    request: new Request(url, { headers: cookie ? { cookie } : {} }),
    locals: {} as App.Locals,
    redirect: (location: string) =>
      new Response(null, { status: 302, headers: { Location: location } }),
  }
  const next = vi.fn(async () => new Response('page'))
  const response = (await onRequest(context as never, next)) as Response
  return { response, next, locals: context.locals }
}

const me = (body: unknown) =>
  vi.fn(async (..._args: unknown[]) => Response.json(body))

describe('middleware', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends visitors without a session to the login page, remembering where they were going', async () => {
    vi.stubGlobal('fetch', me({ user: null }))

    const { response, next } = await run('/team?vis=alle')

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/logg-inn?redirect=%2Fteam%3Fvis%3Dalle')
  })

  it('asks the CMS who the session belongs to, and lets the user through', async () => {
    const fetchMock = me({ user })
    vi.stubGlobal('fetch', fetchMock)

    const { response, next, locals } = await run('/', 'other=1; payload-token=abc.def.ghi')

    expect(fetchMock.mock.calls[0]![0]).toBe('http://localhost:3000/api/brukere/me')
    expect((fetchMock.mock.calls[0]![1] as RequestInit).headers).toMatchObject({
      Authorization: 'JWT abc.def.ghi',
    })
    expect(next).toHaveBeenCalledOnce()
    expect(await response.text()).toBe('page')
    expect(locals.user).toEqual(user)
  })

  it('turns away a session the CMS no longer accepts', async () => {
    vi.stubGlobal('fetch', me({ user: null }))

    const { response, next } = await run('/', 'payload-token=expired')

    expect(next).not.toHaveBeenCalled()
    expect(response.headers.get('Location')).toBe('/logg-inn?redirect=%2F')
  })

  it('lets nobody in when the CMS is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 502 })))

    const { response, next } = await run('/', 'payload-token=abc')

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(503)
  })

  it('leaves the login page open', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { next } = await run('/logg-inn')

    expect(next).toHaveBeenCalledOnce()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
