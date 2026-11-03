import { baseToken, serverUrl, shouldSeed } from './env.js'

//@ChitanyaBharathi > seed.sql resets users &&& demo data > only run it when the root .env says e2e_seed=true
export default async function globalSetup() {
  if (!shouldSeed) { return }
  if (!baseToken) { throw new Error('e2e_seed=true needs basetoken in the root .env') }

  const response = await fetch(`${serverUrl}/seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-base-token': baseToken },
    body: '{}',
  })
  if (!response.ok) {
    throw new Error(`seeding failed > ${response.status} ${await response.text()}`)
  }
}
