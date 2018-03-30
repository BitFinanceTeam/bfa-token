pragma solidity ^0.4.19;

import './BFAToken.sol';
import './math/SafeMath.sol';
import './Haltable.sol';
import './ownership/Ownable.sol';

/**
 * @title Crowdsale
 * @author Volodymyr Katanskyi
 * BitFinance Access Token crowdsale contract based on Open Zeppelin and TokenMarket
 * This crowdsale is modified to have a presale and pre-ICO time period
 * There are six tiers on pre-ICO stage of tokens purchased per wei based on msg value.
 * A finalization function can be called by the owner to issue
 * BitFinance reserves, close minting, and transfer token ownership
 * away from the crowdsale and back to the owner.
 */
contract Crowdsale is Ownable, Haltable {
  using SafeMath for uint256;

  // The token being sold
  BFAToken public token;

  // presale, start and end timestamps where investments are allowed
  uint256 public presaleStartTime;
  uint256 public preICOStartTime;
  uint256 public startTime;
  uint256 public endTime;

  // How many distinct addresses have purchased
  uint public purchaserCount = 0;

  // address where funds are collected
  // TODO: connect with MultiSig Wallet
  address public wallet;

  // how many token units a buyer gets per ether
  // NOTE: $456.5 per ETH 03/27/2018
  uint256 public baseRate = 4565;

  // NOTE: basic forumale is ethPrice / (tokenPrice - (tokenPrice * discount) )
  // TODO: calculate the formulae

  // how many token units a buyer gets per ether on Pre-Sale 50% discount
  // NOTE: $456.5 per ETH 03/27/2018
  uint256 public presaleRate = 9130;

  // how many token units a buyer gets per ether on Pre-ICO Tier 1 40% discount
  // NOTE: $456.5 per ETH 03/27/2018
  // NOTE: for 40% discount it's 456.4 / (0.1 - (0.1 * 0.4) )
  uint256 public tierOneRate = 7608;

  // how many token units a buyer gets per ether on Pre-ICO Tier 2 30% discount
  // NOTE: $456.5 per ETH 03/27/2018
  uint256 public tierTwoRate = 6521;

  // how many token units a buyer gets per ether on Pre-ICO Tier 3 20% discount
  // NOTE: $456.5 per ETH 03/27/2018
  uint256 public tierThreeRate = 5706;

  // how many token units a buyer gets per ether on Pre-ICO Tier 4 15% discount
  // NOTE: $456.5 per ETH 03/27/2018
  uint256 public tierFourRate = 5476;

  // how many token units a buyer gets per ether on Pre-ICO Tier 5 10% discount
  // NOTE: $456.5 per ETH 03/27/2018
  uint256 public tierFiveRate = 5072;

  // how many token units a buyer gets per ether on Pre-ICO Tier 6 5% discount
  // NOTE: $456.5 per ETH 03/27/2018
  uint256 public tierSixRate = 4805;

  // Total amount to be sold in the presale 50M
  uint256 public presaleCap = 50 * 10**18;

  // Total amount to be sold in the tier 1 50M
  uint256 public tierOneCap = 50 * 10**18;

  // Total amount to be sold in the tier 2 50M
  uint256 public tierTwoCap = 50 * 10**18;

  // Total amount to be sold in the tier 3 50M
  uint256 public tierThreeCap = 50 * 10**18;

  // Total amount to be sold in the tier 4 50M
  uint256 public tierFourCap = 50 * 10**18;

  // Total amount to be sold in the tier 5 75M
  uint256 public tierFiveCap = 75 * 10**18;

  // Total amount to be sold in the tier 6 100M
  uint256 public tierSixCap = 100 * 10**18;

  // Total amount to be sold in the tier 6 157.5M
  uint256 public saleCap = 1575 * 10**17;

  // Cumulative total for tier one cap 100M
  uint256 public cumTierOneCap = 100 * 10**18;

  // Cumulative total for tier two cap 150M
  uint256 public cumTierTwoCap = 150 * 10**18;

  // Cumulative total for tier three cap 200M
  uint256 public cumTierThreeCap = 200 * 10**18;

  // Cumulative total for tier four cap 250M
  uint256 public cumTierFourCap = 250 * 10**18;

  // Cumulative total for tier five cap 325M
  uint256 public cumTierFiveCap = 325 * 10**18;

  // Cumulative total for tier six cap 425M
  uint256 public cumTierSixCap = 425 * 10**18;

  // Cumulative total for ICO cap 582.5M
  uint256 public cumTierICOCap = 5825 * 10**17;

  // Total amount to be sold in ether 1B
  uint256 public cap = 1 * 10**21;

  // amount of raised money in wei
  uint256 public weiRaised;

  // Is the contract finalized
  bool public isFinalized = false;

  // How much ETH each address has invested to this crowdsale
  mapping (address => uint256) public purchasedAmountOf;

  // How many tokens this crowdsale has credited for each investor address
  mapping (address => uint256) public tokenAmountOf;

  /**
   * event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

  // Crowdsale end time has been changed
  event EndsAtChanged(uint newEndsAt);

  event Finalized();

  function Crowdsale(uint256 _presaleStartTime, uint256 _preICOStartTime, uint256 _startTime, uint256 _endTime, address _wallet, address _token) public {
    require(_startTime >= now);
    require(_presaleStartTime >= now && _presaleStartTime < _preICOStartTime);
    require(_preICOStartTime >= now && _preICOStartTime < _startTime);
    require(_endTime >= _startTime);
    require(_wallet != 0x0);
    require(_token != 0x0);

    token = BFAToken(_token);
    wallet = _wallet;
    presaleStartTime = _presaleStartTime;
    preICOStartTime = _preICOStartTime;
    startTime = _startTime;
    endTime = _endTime;
  }

  // fallback function can't accept ether
  function () public {
    revert();
  }

  // default buy function
  function buy() public payable {
    buyTokens(msg.sender);
  }

  // low level token purchase function
  // owner may halt payments here
  function buyTokens(address beneficiary) public stopInEmergency payable {
    require(beneficiary != 0x0);
    require(msg.value != 0);

    if(isPresale()) {
      require(validPreSalePurchase());
    } else if(isPreICO()) {
      require(validPreICOPurchase());
    } else {
      require(validPurchase());
    }

    proceedBuyingTokens(beneficiary);
  }

  function proceedBuyingTokens(address beneficiary) internal {
    uint256 weiAmount = msg.value;
    // calculate rates based on tokens issued
    uint256 tokenRate = purchaseRate();
    uint256 tokens = weiAmount.mul(tokenRate);

    // update state
    weiRaised = weiRaised.add(weiAmount);

    // Update purchaser
    if(purchasedAmountOf[msg.sender] == 0) purchaserCount++;
    purchasedAmountOf[msg.sender] = purchasedAmountOf[msg.sender].add(msg.value);
    tokenAmountOf[msg.sender] = tokenAmountOf[msg.sender].add(tokens);

    token.mint(beneficiary, tokens);

    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

    forwardFunds();
  }

  /**
   * @dev Must be called after crowdsale ends, to do some extra finalization
   * work. Calls the contract's finalization function.
   */
  function finalize() public onlyOwner {
    require(!isFinalized);
    require(hasEnded());

    finalization();
    Finalized();

    isFinalized = true;
  }

  /**
   * @dev Finalization logic. We take the expected sale cap of 314159265
   * ether and find the difference from the actual minted tokens.
   * The remaining balance and 40% of total supply are minted
   * to the Matryx team multisig wallet.
   */
  function finalization() internal {
    // calculate token amount to be created
    // get the difference of sold and hard cap

    //,TODO: TEST> 1B - cumTierSixCap == tokens if all tokens sold
    // remaining tokens move to company wallet

    uint256 tokens = cap.sub(token.totalSupply());
    // issue tokens to the multisig wallet
    token.mint(wallet, tokens);
    token.finishMinting();
    token.transferOwnership(msg.sender);
    token.releaseTokenTransfer();
  }

  // send ether to the fund collection wallet
  // override to create custom fund forwarding mechanisms
  function forwardFunds() internal {
    wallet.transfer(msg.value);
  }

  /**
   * Allow crowdsale owner to close early or extend the crowdsale.
   *
   * This is useful e.g. for a manual soft cap implementation:
   * - after X amount is reached determine manual closing
   *
   * This may put the crowdsale to an invalid state,
   * but we trust owners know what they are doing.
   *
   */
  function setEndsAt(uint time) public onlyOwner {
    require(now < time);

    endTime = time;
    EndsAtChanged(endTime);
  }

  // @return the appropriate rates based on wei raised
  function purchaseRate() internal constant returns (uint256) {
    uint256 newWeiRaised = weiRaised.add(msg.value);
    uint256 rate = baseRate;

    if (newWeiRaised <= presaleCap) {
      rate = presaleRate;
    } else if (newWeiRaised <= cumTierOneCap) {
      rate = tierOneRate;
    } else if (newWeiRaised <= cumTierTwoCap) {
      rate = tierTwoRate;
    } else if (newWeiRaised <= cumTierThreeCap) {
      rate = tierThreeRate;
    } else if (newWeiRaised <= cumTierFourCap) {
      rate = tierFourRate;
    } else if (newWeiRaised <= cumTierFiveCap) {
      rate = tierFiveRate;
    } else if (newWeiRaised <= cumTierSixCap) {
      rate = tierSixRate;
    }

    return rate;
  }

  // @return true if the transaction can buy tokens
  function validPreSalePurchase() internal constant returns (bool) {
    bool withinCap = weiRaised.add(msg.value) <= presaleCap;
    return withinCap;
  }

  // @return true if the transaction can buy tokens
  function validPreICOPurchase() internal constant returns (bool) {
    bool withinCap = weiRaised.add(msg.value) <= cumTierSixCap;
    return withinCap;
  }

  // @return true if the transaction can buy tokens
  function validPurchase() internal constant returns (bool) {
    bool withinPeriod = now >= startTime && now <= endTime;
    bool withinCap = weiRaised.add(msg.value) <= cumTierICOCap;
    return withinPeriod && withinCap;
  }

  // @return true if crowdsale event has ended
  function hasEnded() public constant returns (bool) {
    bool capReached = weiRaised >= cumTierICOCap;
    return now > endTime || capReached;
  }

  // @return true if within presale time
  function isPresale() public constant returns (bool) {
    bool withinPresale = now >= presaleStartTime && now < preICOStartTime;
    return withinPresale;
  }

  // @return true if within pre-ICO time
  function isPreICO() public constant returns (bool) {
    bool withinPreICO = now >= preICOStartTime && now < startTime;
    return withinPreICO;
  }
}
