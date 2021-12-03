// https://github.com/seanjameshan/starknet.js/blob/f12db5a9d3d00902792a292e5258263edb7ac7a2/src/signer/default.ts

import { ec as EC } from 'elliptic';
import { Provider, AddTransactionResponse, KeyPair, Transaction, ec, encode, hash, number, stark, SignerInterface } from 'starknet';

export type Sign = (msgHash: string) => Promise<EC.Signature>

export class Signer extends Provider implements SignerInterface {
  public address: string;

  private sign: Sign;

  constructor(provider: Provider, address: string, sign: Sign) {
    super(provider);
    this.sign = sign;
    this.address = address;
  }

  /**
   * Invoke a function on the starknet contract
   *
   * [Reference](https://github.com/starkware-libs/cairo-lang/blob/f464ec4797361b6be8989e36e02ec690e74ef285/src/starkware/starknet/services/api/gateway/gateway_client.py#L13-L17)
   *
   * @param tx - transaction to be invoked
   * @returns a confirmation of invoking a function on the starknet contract
   */
  public override async addTransaction(tx: Transaction): Promise<AddTransactionResponse> {
    if (tx.type === 'DEPLOY') return super.addTransaction(tx);

    const { result } = await this.callContract({
      contract_address: this.address,
      entry_point_selector: stark.getSelectorFromName('get_nonce'),
    });

    const nonceBn = number.toBN(result[0]);
    const calldataDecimal = (tx.calldata || []).map((x) => number.toBN(x).toString());

    const msgHash = encode.addHexPrefix(
      hash.hashMessage(
        this.address,
        tx.contract_address,
        tx.entry_point_selector,
        calldataDecimal,
        nonceBn.toString()
      )
    );

    const { r, s } = await this.sign(msgHash);
    return super.addTransaction({
      type: 'INVOKE_FUNCTION',
      entry_point_selector: stark.getSelectorFromName('execute'),
      calldata: [
        tx.contract_address,
        tx.entry_point_selector,
        calldataDecimal.length.toString(),
        ...calldataDecimal,
        nonceBn.toString(),
      ].map((x) => number.toBN(x).toString()),
      contract_address: this.address,
      signature: [r, s],
    });
  }
}
