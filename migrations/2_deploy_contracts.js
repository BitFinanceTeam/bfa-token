var BFAToken = artifacts.require('./BFAToken.sol')
var Crowdsale = artifacts.require('./Crowdsale.sol')

//  NOTE: unset for production
var test = true;

// test constructor args manually
// TODO: update
const _presaleStartTime = 1506399909
const _startTime = 1508991909
const _preICOStartTime = 1508994909
const _endTime = 1511673909
const _wallet = "0x0040077926585455c40ceA126B37bED392aCa8C2"

module.exports = function(deployer) {
  if(test) {
  	BFAToken.new().then(function(res) {
  	  deployer.deploy(Crowdsale, _presaleStartTime, _preICOStartTime, _startTime, _endTime, _wallet, res.address)
  	})
  } else {
    //deployer.deploy(Crowdsale, 1504052905, 1504056025, 1504059625, "0x0040077926585455c40ceA126B37bED392aCa8C2")
	BFAToken.new().then(function(res) {
	  deployer.deploy(Crowdsale, 1504062025, 1508994909, 1504062925, 1504063825, "0x0040077926585455c40ceA126B37bED392aCa8C2", res.address)
	})
  }
};
