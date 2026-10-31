import { getPayload, Payload, type RequiredDataFromCollectionSlug } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Location, User } from '@/payload-types'

let payload: Payload
let user: User
let location: Location

// Prefix for every test row, so cleanup never touches other data.
const prefix = `int-people-${Date.now()}`

// Leaves out isEmployee and active, so their defaults apply.
const person = (n: number, extra: Record<string, unknown> = {}) =>
  ({
    firstName: 'Kari',
    lastName: `Nordmann ${n}`,
    email: `${prefix}-${n}@example.com`,
    externalId: `${prefix}-person-${n}`,
    externalLocationId: location.externalLocationId,
    ...extra,
  }) as RequiredDataFromCollectionSlug<'personer'>

describe('People and locations', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    user = await payload.create({
      collection: 'brukere',
      data: { email: `${prefix}@example.com`, password: 'test-password' },
    })
    location = await payload.create({
      collection: 'lokasjoner',
      data: { externalLocationId: `${prefix}-loc`, code: `${prefix}-LEI`, name: 'Leikanger' },
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'personer', where: { externalId: { like: prefix } } })
    await payload.delete({ collection: 'lokasjoner', where: { externalLocationId: { like: prefix } } })
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
  })

  it('FO-01: sets fullName from first and last name', async () => {
    const created = await payload.create({ collection: 'personer', data: person(1) })
    expect(created.fullName).toBe('Kari Nordmann 1')

    const updated = await payload.update({
      collection: 'personer',
      id: created.id,
      data: { firstName: 'Ola' },
    })
    expect(updated.fullName).toBe('Ola Nordmann 1')
  })

  it('marks new people as contractors and active by default', async () => {
    const created = await payload.create({ collection: 'personer', data: person(2) })
    expect(created.isEmployee).toBe(false)
    expect(created.active).toBe(true)
  })

  it('NF-07: rejects a duplicate externalId', async () => {
    await payload.create({ collection: 'personer', data: person(3) })
    await expect(
      payload.create({
        collection: 'personer',
        data: person(4, { externalId: `${prefix}-person-3` }),
      }),
    ).rejects.toThrow()
  })

  it('NF-07: requires externalLocationId', async () => {
    await expect(
      payload.create({
        collection: 'personer',
        data: person(5, { externalLocationId: undefined }),
      }),
    ).rejects.toThrow()
  })

  it('NF-07: rejects a duplicate location code', async () => {
    await expect(
      payload.create({
        collection: 'lokasjoner',
        data: { externalLocationId: `${prefix}-loc-2`, code: location.code, name: 'Oslo' },
      }),
    ).rejects.toThrow()
  })

  it('links a person to a manager and a location, and lists people per location', async () => {
    const manager = await payload.create({ collection: 'personer', data: person(6) })
    const employee = await payload.create({
      collection: 'personer',
      data: person(7, {
        externalManagerId: manager.externalId,
        manager: manager.id,
        location: location.id,
        isEmployee: true,
      }),
      depth: 1,
    })
    expect((employee.manager as { id: number }).id).toBe(manager.id)
    expect((employee.location as Location).name).toBe('Leikanger')

    const withPeople = await payload.findByID({ collection: 'lokasjoner', id: location.id })
    const ids = (withPeople.people?.docs ?? []).map((p) => (typeof p === 'object' ? p.id : p))
    expect(ids).toContain(employee.id)
  })

  it('NF-07: lets signed-in users read people and locations, but not anonymous users', async () => {
    await payload.create({ collection: 'personer', data: person(8) })
    const where = { externalId: { equals: `${prefix}-person-8` } }

    const signedIn = await payload.find({ collection: 'personer', where, overrideAccess: false, user })
    expect(signedIn.docs).toHaveLength(1)

    await expect(payload.find({ collection: 'personer', where, overrideAccess: false })).rejects.toThrow()
    await expect(payload.find({ collection: 'lokasjoner', overrideAccess: false })).rejects.toThrow()
  })

  it('NF-07: only the import can change people and locations', async () => {
    const created = await payload.create({ collection: 'personer', data: person(9) })

    await expect(
      payload.create({ collection: 'personer', data: person(10), overrideAccess: false, user }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'personer',
        id: created.id,
        data: { title: 'Seniorrådgiver' },
        overrideAccess: false,
        user,
      }),
    ).rejects.toThrow()
    await expect(
      payload.delete({ collection: 'personer', id: created.id, overrideAccess: false, user }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'lokasjoner',
        id: location.id,
        data: { name: 'Oslo' },
        overrideAccess: false,
        user,
      }),
    ).rejects.toThrow()
  })
})
