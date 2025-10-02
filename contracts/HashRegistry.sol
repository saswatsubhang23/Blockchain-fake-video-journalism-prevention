// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HashRegistry {
    event Registered(bytes32 indexed hash, string uri, address indexed by);

    mapping(bytes32 => bool) public isRegistered;

    function register(bytes32 hash, string calldata uri) external {
        require(!isRegistered[hash], "Already registered");
        isRegistered[hash] = true;
        emit Registered(hash, uri, msg.sender);
    }
}