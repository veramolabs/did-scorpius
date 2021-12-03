import { TKeyType, IKey, ManagedKeyInfo, MinimalImportableKey, RequireOnly } from '@veramo/core'
import { AbstractKeyManagementSystem, AbstractPrivateKeyStore, ManagedPrivateKey } from '@veramo/key-manager'
import Debug from 'debug'
import { ec, encode } from 'starknet'
import {
  generateKeyPair as generateSigningKeyPair,
  extractPublicKeyFromSecretKey,
} from '@stablelib/ed25519'
import * as u8a from 'uint8arrays'

const debug = Debug('veramo:my-kms')
/**
 * You can use this template for an `AbstractKeyManagementSystem` implementation.
 * Key Management Systems are the bridge between key material and the cryptographic operations that can be performed with it.
 *
 * This interface is used by `@veramo/key-manager` to delegate cryptographic operations to the actual implementation.
 * Veramo can use multiple key management systems at the same time, and if you wish to ad your own
 * you need to implement a class like this.
 *
 * If you don't want to customize this, then it is safe to remove from the template.
 *
 * @alpha
 */
export class MyKeyManagementSystem extends AbstractKeyManagementSystem {

  private readonly keyStore: AbstractPrivateKeyStore

  constructor(keyStore: AbstractPrivateKeyStore) {
    super()
    this.keyStore = keyStore
  }

  async importKey(args: Omit<MinimalImportableKey, 'kms'>): Promise<ManagedKeyInfo> {
    if (!args.type || !args.privateKeyHex) {
      throw new Error('invalid_argument: type and privateKeyHex are required to import a key')
    }
    const managedKey = this.asManagedKeyInfo({ alias: args.kid, ...args })
    await this.keyStore.import({ alias: managedKey.kid, ...args })
    debug('imported key', managedKey.type, managedKey.publicKeyHex)
    return managedKey
  }

  /**
   * Converts a {@link ManagedPrivateKey} to {@link ManagedKeyInfo}
   */
  private asManagedKeyInfo(args: RequireOnly<ManagedPrivateKey, 'privateKeyHex' | 'type'>): ManagedKeyInfo {
    let key: Partial<ManagedKeyInfo>
    switch (args.type as any) {
      case 'Ed25519': {
        const secretKey = u8a.fromString(args.privateKeyHex.toLowerCase(), 'base16')
        const publicKeyHex = u8a.toString(extractPublicKeyFromSecretKey(secretKey), 'base16')
        key = {
          type: args.type,
          kid: args.alias || publicKeyHex,
          publicKeyHex,
          meta: {
            algorithms: ['Ed25519', 'EdDSA'],
          },
        }
        break
      }
      case 'StarkNetKey': {
        const keyPair = ec.getKeyPair(args.privateKeyHex)
        const publicKeyHex = ec.getStarkKey(keyPair)
        key = {
          type: args.type,
          kid: args.alias || publicKeyHex,
          publicKeyHex,
          meta: {
            algorithms: ['StarkNetSign'],
          },
        }
        break
      }
      
      default:
        throw Error('not_supported: Key type not supported: ' + args.type)
    }
    return key as ManagedKeyInfo
  }  

  /**
   * Sign the `data` using the `algorithm` and the key referenced by `keyRef`.
   */
  async sign({
    keyRef,
    algorithm,
    data,
  }: {
    keyRef: Pick<IKey, 'kid'>
    algorithm?: string
    data: Uint8Array
  }): Promise<string> {
    let managedKey: ManagedPrivateKey
    try {
      managedKey = await this.keyStore.get({ alias: keyRef.kid })
    } catch (e) {
      throw new Error(`key_not_found: No key entry found for kid=${keyRef.kid}`)
    }

    if (
      managedKey.type as any === 'StarkNetKey' &&
      (typeof algorithm === 'undefined' || ['StarkNetSign'].includes(algorithm))
    ) {
      return await this.signStark(managedKey.privateKeyHex, data)
    } 
    throw Error(`not_supported: Cannot sign ${algorithm} using key of type ${managedKey.type}`)
  }

  private async signStark(key: string, data: Uint8Array): Promise<any> {
    const keyPair = ec.getKeyPair(key)
    const signature = ec.sign(keyPair, Buffer.from(data).toString('utf-8'))
    // FIXME
//    return JSON.stringify(signature)
    return signature
  }

  /**
   * Compute a shared secret between `theirKey` (public) and `myKey` (secret)
   * `myKeyRef` is used to reference the key managed by this key management system.
   * @param args
   */
  async sharedSecret(args: { myKeyRef: Pick<IKey, 'kid'>; theirKey: Pick<IKey, 'type' | 'publicKeyHex'> }): Promise<string> {
    throw new Error('Method not implemented.')
  }


  async listKeys(): Promise<ManagedKeyInfo[]> {
    throw new Error('Method not implemented.')
  }

  async createKey({ type, meta }: { type: TKeyType; meta?: any }): Promise<ManagedKeyInfo> {
    let key: ManagedKeyInfo

    switch (type as any) {
      case 'Ed25519': {
        const keyPairEd25519 = generateSigningKeyPair()
        key = await this.importKey({
          type,
          privateKeyHex: u8a.toString(keyPairEd25519.secretKey, 'base16'),
        })
        break
      }
      case 'Secp256k1':
        throw Error('MyKeyManagementSystem createKey Secp256k1 not implemented')
        break
      case 'X25519':
        throw Error('MyKeyManagementSystem createKey X25519 not implemented')
      case 'StarkNetKey':
        const keyPair = ec.genKeyPair()
        key = await this.importKey({
          type,
          privateKeyHex: encode.addHexPrefix(keyPair.getPrivate().toString('hex')),
        })
        break
      default:
        throw Error('Key type not supported by MyKeyManagementSystem: ' + type)
    }
    return key
  }

  async deleteKey(args: { kid: string }) {
    throw Error('KeyManagementSystem deleteKey not implemented')
    return true
  }
}
