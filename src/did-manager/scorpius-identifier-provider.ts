import { IIdentifier, IKey, IService, IAgentContext, IKeyManager, TKeyType } from '@veramo/core'
import { AbstractIdentifierProvider } from '@veramo/did-manager'
import { CompiledContract, json, defaultProvider, compileCalldata, stark, number, uint256, shortString } from 'starknet'
import fs from 'fs'
import path from 'path'
import Debug from 'debug'
import { Sign, Signer } from '../key-manager/starknet-signer'
const debug = Debug('veramo:did-provider-scorpius')

const registryAddress = '0x026baddbacb85e634d59e1f63fb984d6b308533141cefcfba00f91ae00d17512'


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
    //FIXME add 'StarkNetKey' to TKeyType
    const key = await context.agent.keyManagerCreate({ kms: kms || this.defaultKms, type: 'StarkNetKey' })
    
    //FIXME should not use `fs`
    const compiledArgentAccount: CompiledContract = json.parse(
      fs.readFileSync( path.resolve('./starknet-artifacts/contracts/ArgentAccount.cairo/ArgentAccount.json')).toString('ascii')
    )

    debug('Deploying ArgentAccount contract')
    const { address, transaction_hash } = await defaultProvider.deployContract(
      compiledArgentAccount,
      compileCalldata({
        signer: key.publicKeyHex,
        guardian: '0',
      }),
      key.publicKeyHex
    );

    debug('Account address', address)
    debug('Waiting for transaction', transaction_hash)
    await defaultProvider.waitForTx(transaction_hash);

    const identifier: Omit<IIdentifier, 'provider'> = {
      did: 'did:scorpius:' + address,
      controllerKeyId: key.kid,
      keys: [key],
      services: [],
    }
    debug('Created', identifier.did)
    return identifier
  }

  private getSigner(identifier: IIdentifier, context: IContext): Sign {
    const sign = async (msgHash: string) => {
      const signature: any = await context.agent.keyManagerSign({
        keyRef: identifier.controllerKeyId as string,
        data: msgHash,
        algorithm: 'StarkNetSign',
      })

      //FIXME
      // const signature = JSON.parse(signatureString)
      return signature
    }
    return sign
  }

  async deleteIdentifier(identity: IIdentifier, context: IContext): Promise<boolean> {
    throw Error('IdentityProvider deleteIdentity not implemented')
    return true
  }

  async addKey(
    { identifier, key, options }: { identifier: IIdentifier; key: IKey; options?: any },
    context: IContext
  ): Promise<any> {
    const address = identifier.did.split(':').pop() as string

    const sign = this.getSigner(identifier, context)    
    const signer = new Signer(defaultProvider, address, sign);
    debug('Adding new key', key.publicKeyHex)

    const keyUint256 = uint256.bnToUint256(number.toBN('0x' + key.publicKeyHex))

    const { code, transaction_hash } = await signer.addTransaction({
      type: 'INVOKE_FUNCTION',
      contract_address: registryAddress,
      entry_point_selector: stark.getSelectorFromName('add_key'),
      calldata: [
        shortString.encodeShortString(key.type), 
        keyUint256.low.toString(),
        keyUint256.high.toString()
      ],
    });
    debug('Transaction code', code)
    debug('Waiting for transaction', transaction_hash)
    await defaultProvider.waitForTx(transaction_hash);

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
