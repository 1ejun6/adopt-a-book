import { supabaseSecretKey, supabaseUrl } from './env.js'

//@ChitanyaBharathi > every customer a test registers > deleted again once that test ends
const registered = []
export function trackCustomer(id) {
  if (id) { registered.push(id) }
}

async function supabase(method, path, body) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: { apikey: supabaseSecretKey, authorization: `Bearer ${supabaseSecretKey}`, 'content-type': 'application/json' },
    body: body && JSON.stringify(body),
  })
  if (!response.ok && response.status !== 404) {
    throw new Error(`cleanup ${method} ${path} failed > ${response.status} ${await response.text()}`)
  }
  return response.status === 204 || response.status === 404 ? null : response.json()
}

//@ChitanyaBharathi > rsvps live in adoptiondrives.userids, not a table > take the customer off each drive first
//@ChitanyaBharathi > deleting the auth user cascades to users, watchlist, applications &&& appointments
async function deleteCustomer(id) {
  const drives = await supabase('GET', `/rest/v1/adoptiondrives?select=id&userids=cs.{${id}}`)
  for (const drive of drives ?? []) {
    await supabase('POST', '/rest/v1/rpc/cancel_drive_rsvp', { drive_id: drive.id, customer_id: id })
  }
  await supabase('DELETE', `/auth/v1/admin/users/${id}`)
}

export async function deleteTrackedCustomers() {
  if (!registered.length) { return }
  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error('deleting test customers needs supabaseurl and supabasesecretkey in the root .env')
  }
  const ids = registered.splice(0)
  const failures = []
  for (const id of ids) {
    try { await deleteCustomer(id) } catch (error) { failures.push(`${id} > ${error.message}`) }
  }
  if (failures.length) { throw new Error(`could not delete test customers:\n${failures.join('\n')}`) }
}
