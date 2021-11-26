import { expect } from "chai";
import { starknet } from "hardhat";
import { StarknetContract, StarknetContractFactory } from "hardhat/types/runtime";
import { stark, compileCalldata } from "starknet";

describe("Starknet", function () {
  this.timeout(300_000); // 5 min
  let preservedRegistryAddress: string;

  let registryContractFactory: StarknetContractFactory;
  let accountContractFactory: StarknetContractFactory;

  let registryContract: StarknetContract;
  let accountContract: StarknetContract;

  before(async function() {
    // assumes contracts have been compiled
    accountContractFactory = await starknet.getContractFactory("account");
    registryContractFactory = await starknet.getContractFactory("registry");
    console.log("Started registry deployment");
    registryContract = await registryContractFactory.deploy();
    preservedRegistryAddress = registryContract.address;
    console.log("Deployed registry at", registryContract.address);

    accountContract = await accountContractFactory.deploy();
    console.log("Deployed account at", accountContract.address);
  });
  
  it("should have no keys after a fresh deployment", async function() {
    const { res: key } = await registryContract.call("get_key", {
      address: BigInt(accountContract.address), 
      index: 0 
    });
    expect(key).to.deep.equal({ type:0n, publicKey: 0n });
    
    const { res: len } = await registryContract.call("get_keys_len", {
      address: BigInt(accountContract.address) 
    });
    expect(len).to.deep.equal(0n);
  })

  it("should add a key", async function() {

    await accountContract.invoke("execute", { 
      to: BigInt(preservedRegistryAddress), 
      selector: BigInt(stark.getSelectorFromName('add_key')),
      calldata: [ 1n, 123n ]
    });
    
    const { res: len } = await registryContract.call("get_keys_len", {
      address: BigInt(accountContract.address)
    });
    expect(len).to.deep.equal(1n);
    
    const { res: key } = await registryContract.call("get_key", {
      address: BigInt(accountContract.address),
      index: 0n
    });
    
    expect(key).to.deep.equal({ 
      type:1n,
      publicKey: 123n
    });


  });
  
  it("should remove a key", async function() {

    await accountContract.invoke("execute", { 
      to: BigInt(preservedRegistryAddress), 
      selector: BigInt(stark.getSelectorFromName('remove_key')),
      calldata: [ 0n ]
    });

    const { res: key } = await registryContract.call("get_key", { 
      address: BigInt(accountContract.address),
      index: 0n
    });
    expect(key).to.deep.equal({ type:0n, publicKey: 0n });

    const { res: len } = await registryContract.call("get_keys_len", { address: BigInt(accountContract.address) });
    expect(len).to.deep.equal(1n);
  })

  });
