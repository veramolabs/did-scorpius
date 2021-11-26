import { BigNumber } from '@ethersproject/bignumber'
import { Contract, ContractFactory } from '@ethersproject/contracts'
import { InfuraProvider, JsonRpcProvider, Provider } from '@ethersproject/providers'
import { DEFAULT_REGISTRY_ADDRESS, knownInfuraNetworks, knownNetworks } from './helpers'

/**
 * A configuration entry for an ethereum network
 * It should contain at least one of `name` or `chainId` AND one of `provider`, `web3`, or `rpcUrl`
 *
 * @example ```js
 * { name: 'development', registry: '0x9af37603e98e0dc2b855be647c39abe984fc2445', rpcUrl: 'http://127.0.0.1:8545/' }
 * { name: 'goerli', chainId: 5, provider: new InfuraProvider('goerli') }
 * { name: 'rinkeby', provider: new AlchemyProvider('rinkeby') }
 * { name: 'rsk:testnet', chainId: '0x1f', rpcUrl: 'https://public-node.testnet.rsk.co' }
 * ```
 */
export interface ProviderConfiguration {
  name?: string
  provider?: Provider
  rpcUrl?: string
  registry?: string
  chainId?: string | number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  web3?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [index: string]: any
}

export interface MultiProviderConfiguration extends ProviderConfiguration {
  networks?: ProviderConfiguration[]
}

export interface InfuraConfiguration {
  infuraProjectId: string
}

export type ConfigurationOptions = MultiProviderConfiguration | InfuraConfiguration

export type ConfiguredNetworks = Record<string, Contract>



