%lang starknet
%builtins pedersen range_check

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.starknet.common.syscalls import get_caller_address

struct Key:
    member type: felt
    member publicKey: felt
end

@storage_var
func keys(address: felt, index: felt) -> (res: Key):
end

@storage_var
func keys_len(address: felt) -> (res: felt):
end

@view
func get_keys_len{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(address: felt) -> (res: felt):
    let (res) = keys_len.read(address)
    return (res=res)
end

@view
func get_key{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(address: felt, index: felt) -> (res: Key):
    let (res) = keys.read(address, index)
    return (res=res)
end

@external
func add_key{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(key: Key):
    # }(address: felt, key: Key):
    let (address) = get_caller_address()
    let (len) = keys_len.read(address)
    keys_len.write(address, len + 1)
    keys.write(address,  len, key)
    return ()
end

@external
func remove_key{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(index: felt):
    # }(address: felt, index: felt):
    let (address) = get_caller_address()
    keys.write(address,  index, value=Key(type=0, publicKey=0)) 
    return ()
end