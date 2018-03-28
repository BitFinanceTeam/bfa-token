pragma solidity ^0.4.19;

import "./MintableToken.sol";
import "./UpgradeableToken.sol";

/**
 * Matryx Ethereum token.
 */
contract BFAToken is MintableToken, UpgradeableToken{

  string public name = "BitfinanceAccessToken";
  string public symbol = "BFA";
  uint public decimals = 18;

  // supply upgrade owner as the contract creation account
  function BFAToken() UpgradeableToken(msg.sender) public {

  }
}
