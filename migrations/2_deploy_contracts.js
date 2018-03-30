var BFAToken = artifacts.require('./BFAToken.sol')
var Crowdsale = artifacts.require('./Crowdsale.sol')

//  NOTE: unset for production
var test = true;

// test constructor args manually
// TODO: update
const _presaleStartTime = 1522458257
const _preICOStartTime = 1522544664
const _startTime = 1522631094
const _endTime = 1522717500
const _wallet = "0x01da6f5f5c89f3a83cc6bebb0eafc1f1e1c4a303"

module.exports = function(deployer) {
  if(test) {
  	BFAToken.new().then(function(res) {
  	  deployer.deploy(Crowdsale, _presaleStartTime, _preICOStartTime, _startTime, _endTime, _wallet, res.address)
  	})
  } else {
    //deployer.deploy(Crowdsale, 1504052905, 1504056025, 1504059625, "0x0040077926585455c40ceA126B37bED392aCa8C2")
	BFAToken.new().then(function(res) {
	  deployer.deploy(Crowdsale, 1522454183, 1522814207, 1523534219, 1524974237, "0x01da6f5f5c89f3a83cc6bebb0eafc1f1e1c4a303", res.address)
	})
  }
};
