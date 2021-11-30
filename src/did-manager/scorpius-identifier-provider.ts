import { IIdentifier, IKey, IService, IAgentContext, IKeyManager } from '@veramo/core'
import { AbstractIdentifierProvider } from '@veramo/did-manager'
import { CompiledContract, json, defaultProvider, compileCalldata,ec } from 'starknet'
import fs from 'fs'
import path from 'path'
import Debug from 'debug'
const debug = Debug('veramo:did-provider-scorpius')


type IContext = IAgentContext<IKeyManager>

/**
 * You can use this template for an `AbstractIdentifierProvider` implementation.
 *
 * Implementations of this interface are used by `@veramo/did-manager` to implement
 * CRUD operations for various DID methods.
 *
 * If you wish to implement support for a particular DID method, this is the type of class
 * you need to implement.
 *
 * If you don't want to customize this, then it is safe to remove from the template.
 *
 * @alpha
 */
export class ScorpiusIdentifierProvider extends AbstractIdentifierProvider {
  private defaultKms: string

  constructor(options: { defaultKms: string }) {
    super()
    this.defaultKms = options.defaultKms
  }

  async createIdentifier(
    { kms, alias }: { kms?: string; alias?: string },
    context: IContext
  ): Promise<Omit<IIdentifier, 'provider'>> {
    //@ts-ignore
    const key = await context.agent.keyManagerCreate({ kms: kms || this.defaultKms, type: 'StarkNetKey' })
    const compiledArgentAccount: CompiledContract = json.parse(
      fs.readFileSync( path.resolve('./starknet-artifacts/contracts/ArgentAccount.cairo/ArgentAccount.json')).toString('ascii')
    )

    debug('Deploying argent contract')
    const { address, transaction_hash } = await defaultProvider.deployContract(
      compiledArgentAccount,
      compileCalldata({
        signer: key.publicKeyHex,
        guardian: '0',
      }),
      key.publicKeyHex
    );

    debug('Transaction hash', transaction_hash)

    const identifier: Omit<IIdentifier, 'provider'> = {
      did: 'did:scorpius:' + address,
      controllerKeyId: key.kid,
      keys: [key],
      services: [],
    }
    debug('Created', identifier.did)
    return identifier
  }

  async deleteIdentifier(identity: IIdentifier, context: IContext): Promise<boolean> {
    throw Error('IdentityProvider deleteIdentity not implemented')
    return true
  }

  async addKey(
    { identifier, key, options }: { identifier: IIdentifier; key: IKey; options?: any },
    context: IContext
  ): Promise<any> {
    throw Error('IdentityProvider addKey not implemented')
    return { success: true }
  }

  async addService(
    { identifier, service, options }: { identifier: IIdentifier; service: IService; options?: any },
    context: IContext
  ): Promise<any> {
    throw Error('IdentityProvider addService not implemented')
    return { success: true }
  }

  async removeKey(args: { identifier: IIdentifier; kid: string; options?: any }, context: IContext): Promise<any> {
    throw Error('IdentityProvider removeKey not implemented')
    return { success: true }
  }

  async removeService(args: { identifier: IIdentifier; id: string; options?: any }, context: IContext): Promise<any> {
    throw Error('IdentityProvider removeService not implemented')
    return { success: true }
  }
}
