import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'

// Everyone in Digdir can log in, so only administrators manage users and
// media, and the admin panel is for administrators only.

let payload: Payload
let admin: User
let employee: User
let colleague: User

const prefix = `int-users-${Date.now()}`

const asUser = (user: User) => ({ user: { ...user, collection: 'brukere' as const }, overrideAccess: false })

describe('Users', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const create = (name: string, roles: User['roles'] = []) =>
      payload.create({
        collection: 'brukere',
        data: { email: `${prefix}-${name}@example.com`, password: 'test-password', roles },
      })
    admin = await create('admin', ['admin'])
    employee = await create('employee')
    colleague = await create('colleague')
  })

  afterAll(async () => {
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
  })

  it('lets only administrators into the admin panel', async () => {
    const access = payload.collections.brukere.config.access.admin!
    const req = (user: User) => ({ req: { user: { ...user, collection: 'brukere' } } }) as never

    expect(await access(req(admin))).toBe(true)
    expect(await access(req(employee))).toBe(false)
  })

  it('lets an employee read only their own user', async () => {
    const { docs } = await payload.find({
      collection: 'brukere',
      where: { email: { like: prefix } },
      ...asUser(employee),
    })

    expect(docs.map((u) => u.id)).toEqual([employee.id])
  })

  it('lets administrators read every user', async () => {
    const { totalDocs } = await payload.find({
      collection: 'brukere',
      where: { email: { like: prefix } },
      ...asUser(admin),
    })

    expect(totalDocs).toBe(3)
  })

  it('stops an employee from making themselves an administrator', async () => {
    await expect(
      payload.update({ collection: 'brukere', id: employee.id, data: { roles: ['admin'] }, ...asUser(employee) }),
    ).rejects.toThrow()
  })

  it('stops an employee from changing another user', async () => {
    await expect(
      payload.update({
        collection: 'brukere',
        id: colleague.id,
        data: { password: 'taken-over' },
        ...asUser(employee),
      }),
    ).rejects.toThrow()
  })

  it('stops an employee from creating users', async () => {
    await expect(
      payload.create({
        collection: 'brukere',
        data: { email: `${prefix}-new@example.com`, password: 'test-password' },
        ...asUser(employee),
      }),
    ).rejects.toThrow()
  })

  it('lets only administrators change media', async () => {
    const { access } = payload.collections.medier.config
    const req = (user: User) => ({ req: { user: { ...user, collection: 'brukere' } } }) as never

    for (const operation of ['create', 'update', 'delete'] as const) {
      expect(await access[operation]!(req(admin))).toBe(true)
      expect(await access[operation]!(req(employee))).toBe(false)
    }
  })
})
