/**
 * @public
 */
const schema = require('../plugin.schema.json')
export { schema }
export { MyAgentPlugin } from './agent/my-plugin'
export { MyKeyManagementSystem } from './key-manager/my-key-management-system'
export { MyKeyStore } from './key-manager/my-key-store'
export { SecretBox } from './key-manager/my-secret-box'
export { ScorpiusIdentifierProvider } from './did-manager/scorpius-identifier-provider'
export { MyDIDStore } from './did-manager/my-did-store'
export { ScorpiusDidResolver } from './did-resolver/did-scorpius-resolver'
export * from './types/IMyAgentPlugin'
