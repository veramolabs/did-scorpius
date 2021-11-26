import { defaultProvider, stark } from 'starknet'
import { Base58 } from '@ethersproject/basex'
import { BigNumber } from '@ethersproject/bignumber'
import { Block, BlockTag } from '@ethersproject/providers'
import { ConfigurationOptions } from './configuration'
import {
  DIDDocument,
  DIDResolutionOptions,
  DIDResolutionResult,
  DIDResolver,
  ParsedDID,
  Resolvable,
  ServiceEndpoint,
  VerificationMethod,
} from 'did-resolver'

import * as qs from 'querystring'
import { Errors, identifierMatcher } from './helpers'


export interface Key {
  type: string
  publicKey: string
}

const keyMapping: Record<string, string> = {
  '0': 'EcdsaSecp256k1VerificationKey2019',
  '1': 'Ed25519VerificationKey2018',
  '2': 'X25519KeyAgreementKey2019',
}

const registryAddress = '0x07b4f8fcfc647cbbeac352588faec88b69c1d659128a8ecf8b0d71cbbc3979a2'

export class ScorpiusDidResolver {

  constructor(options: ConfigurationOptions) {
    return resolve
  }

}

const resolve = async (
  did: string,
  parsed: ParsedDID,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _unused: Resolvable,
  options: DIDResolutionOptions
): Promise<DIDResolutionResult> => {

  const { result } = await defaultProvider.callContract({
    contract_address: registryAddress,
    entry_point_selector: stark.getSelectorFromName('get_keys_len'),
    calldata: [BigInt(parsed.id).toString()]
  })

  const len = BigInt(result[0])
  const keys: Key[] = []

  for (let index = 0; index < len; index++) {
    const { result } = await defaultProvider.callContract({
      contract_address: registryAddress,
      entry_point_selector: stark.getSelectorFromName('get_key'),
      calldata: [BigInt(parsed.id).toString(), BigInt(index).toString()]
    })
    if (result[0]!== '0x0' && result[1] != '0x0') {
      keys.push({
        type: BigInt(result[0]).toString(),
        publicKey: BigInt(result[1]).toString(),
      })
    }
  }

  
  const allKeys = keys.map((key, index) => ({
    id: did + '#' + index,
    type: keyMapping[key.type],
    controller: did,
    publicKeyHex: key.publicKey,
  }))
  // ed25519 keys can also be converted to x25519 for key agreement
  const keyAgreementKeyIds = allKeys
    .filter((key) => ['Ed25519VerificationKey2018', 'X25519KeyAgreementKey2019'].includes(key.type))
    .map((key) => key.id)
  const signingKeyIds = allKeys
    .filter((key) => key.type !== 'X25519KeyAgreementKey2019')
    .map((key) => key.id)

  const didDocument: DIDDocument = {
    '@context': 'https://w3id.org/did/v1',
    id: did,
    verificationMethod: allKeys,
    authentication: signingKeyIds,
    assertionMethod: signingKeyIds,
    keyAgreement: keyAgreementKeyIds,
  }

  return {
    didDocumentMetadata: { },
    didResolutionMetadata: { contentType: 'application/did+ld+json' },
    didDocument,
  }

}