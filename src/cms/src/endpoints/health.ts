import type { Endpoint } from 'payload'

// Public check that the CMS is up and can reach its database. It answers
// with a fixed status only, so it reveals nothing about the content.
export const health: Endpoint = {
  path: '/health',
  method: 'get',
  handler: async (req) => {
    await req.payload.count({ collection: 'brukere' })
    return Response.json({ status: 'ok' })
  },
}
