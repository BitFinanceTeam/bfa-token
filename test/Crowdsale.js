'use strict'

import BigNumber from 'bignumber.js'
import {increaseTimeTo, duration} from './helpers/increaseTime'

const Crowdsale = artifacts.require("./Crowdsale.sol")
const Token = artifacts.require("./BFAToken")

let inst
let token
let crowdsaleAddy

// token balances
let a0Balance
let a1Balance
// supply
let tSupply
let wieSupply
let pt
let tt


// tier preSale purchase wei
const nPresale = new BigNumber(9130*50*Math.pow(10, 18))
// tier I purchase wei
const n1 = new BigNumber(7608*50*Math.pow(10, 18))
// tier II purchase wei
const n2 = new BigNumber(6521*50*Math.pow(10, 18))
// tier III purchase wei
const n3 = new BigNumber(5706*50*Math.pow(10, 18))
// tier IV purchase wei
const n4 = new BigNumber(5476*50*Math.pow(10, 18))
// tier V purchase wei
const n5 = new BigNumber(5072*75*Math.pow(10, 18))
// tier VI purchase wei
const n6 = new BigNumber(4805*100*Math.pow(10, 18))
// tier VI purchase wei
const nICO = new BigNumber(4565*1575*Math.pow(10, 17))

// tier preSale wei
const nPresaleCap = new BigNumber(50*Math.pow(10, 18))
// tier I purchase wei Cap
const n1Cap = nPresaleCap.plus(new BigNumber(50*Math.pow(10, 18)))
// tier II purchase wei Cap
const n2Cap = n1Cap.plus(new BigNumber(50*Math.pow(10, 18)))
// tier III purchase wei Cap
const n3Cap = n2Cap.plus(new BigNumber(50*Math.pow(10, 18)))
// tier IV purchase wei Cap
const n4Cap = n3Cap.plus(new BigNumber(50*Math.pow(10, 18)))
// tier V purchase wei Cap
const n5Cap = n4Cap.plus(new BigNumber(75*Math.pow(10, 18)))
// tier VI purchase wei Cap
const n6Cap = n5Cap.plus(new BigNumber(100*Math.pow(10, 18)))
// ICO tier purchase wei Cap
const nICOCap = n6Cap.plus(new BigNumber(1575*Math.pow(10, 17)))


// regular sale purchase wei
// const nBase = new BigNumber(1*Math.pow(10, 18))
// // presale wei cap
// const p = new BigNumber(809015*Math.pow(10, 17))
// sale wei cap
// const t = new BigNumber(161803*Math.pow(10, 18))

// init args
const _presaleStartTime = 1522458257
const _preICOStartTime = 1522544664
const _startTime = 1522631094
const _endTime = 1522717500
const _wallet = "0x01da6f5f5c89f3a83cc6bebb0eafc1f1e1c4a303"

contract('TestCrowdSale', async (accounts) => {
  it("Crowdsale & Token deployed", async function() {
    token = await Token.new()
    inst = await Crowdsale.new(_presaleStartTime, _preICOStartTime, _startTime, _endTime, _wallet, token.address)
    tSupply = await token.totalSupply.call()
    crowdsaleAddy = inst.address
    // assert totalSupply init to 0
    assert.equal(0, tSupply, "totalSupply not initilized correctly")
  })

  it("Only owner can set release agent", async function() {
    await token.setReleaseAgent(accounts[1], {from: accounts[1]})
    let agent = await token.releaseAgent.call()
    assert(agent, "0x0000000000000000000000000000000000000000")
  })

  it("sets the release agent", async () => {
    await token.setReleaseAgent(inst.address, {from: accounts[0]})
    let agent = await token.releaseAgent.call()
    assert.equal(agent, inst.address, "incorrect release agent set")
  })

  it("must set token owner to crowdsale after setting release agent", async function() {
    // tansfer owner to crowdsale
    await token.transferOwnership(inst.address)
  })

  it("Crowdsale has correct owner", async function(){
    var owner = await inst.owner.call()
    assert.equal(owner, accounts[0])
  })

  it("token has correct owner", async function(){
    var tokenOwner = await token.owner.call()
    // assert token is owned by crowdsale contract
    assert.equal(tokenOwner, inst.address)
  })

  it("can't buy before presale time", async function() {
    await inst.buy({from: accounts[0], value: 20000})
    let raised = await inst.weiRaised.call()
    // assert weiRaiser = 0
    assert.equal(raised, 0, "wei raised is incorrect")

    tSupply = await token.totalSupply.call()
    // assert total supply = 0
    // assert.equal(tSupply, 0, "whitelist presale buy not correct")

    let purchased = await token.balanceOf(accounts[0])
    // assert total = 0
    assert.equal(purchased, 0, "purchaser balance presale buy not correct")
  })

  it("halts payments in an emergency", async function() {
    await inst.halt({from: accounts[0]})

    let afterPresaleStart = _presaleStartTime + duration.seconds(1)
    await increaseTimeTo(afterPresaleStart)

    await inst.buy({from: accounts[1], value: 20000})
    let raised = await inst.weiRaised.call()
    // // assert wei raised is 0
    assert.equal(raised.toNumber(), 0, "halted wei presale purchase did not issue correct amount")
    //
    await inst.unhalt({from: accounts[0]})
    let halted = await inst.halted.call()
    // // assert halted is false now
    assert.equal(halted, false, "could not unhalt crowdsale")
  })

  it("can buy presale during allowed time", async function() {
    await inst.buy({from: accounts[1], value: 50*Math.pow(10, 18)})
    let raised = await inst.weiRaised.call()
    // assert weiRaised = 25 eth
    assert.equal(raised.toNumber(), 50*Math.pow(10, 18), "presale purchase did not issue correct amount")
    tSupply = await token.totalSupply.call()
    // assert total supply = 25 eth * 9130
    assert.equal(tSupply.toNumber(), 50*Math.pow(10, 18)*9130, "halted wei presale purchase did not issue correct amount")

    a1Balance = await token.balanceOf(accounts[1])
    // assert total = 25 eth * 9130
    assert.equal(a1Balance.toNumber(), (50*Math.pow(10, 18)*9130), "25 eth presale purchase did not issue correct amount")
  })

  it("token cannot be transfered before Finalized", async function() {
    await token.transfer(accounts[0], 50*Math.pow(10, 18)*9130, {from: accounts[1]})
    a1Balance = await token.balanceOf(accounts[1])
    // assert total = 50 eth * 9130
    assert.equal(a1Balance.toNumber(), (50*Math.pow(10, 18)*9130), "50 eth presale purchase did not issue correct amount")
  })
  //
  it("Only release agent can make token transferable", async function() {
    let released = await token.released.call()
    assert.equal(released, false)

    // assert even owner cannot release
    await token.releaseTokenTransfer({from: _wallet})
    released = await token.released.call()
    assert.equal(released, false)
  })

  it("only owner can mint", async function() {
    await token.mint(crowdsaleAddy, 50*Math.pow(10, 18), {from: accounts[0]})
    tSupply = await token.totalSupply.call()
    // assert total supply = 25 eth * 9130
    assert.equal(tSupply.toNumber(), 50*Math.pow(10, 18)*9130, "direct minting purchase did not issue correct amount")
  })

  it("can buy preICO tier I purchase", async function() {//7608 cap: 50 * 10**24
    let afterPreICOStart = _preICOStartTime + duration.seconds(1)
    await increaseTimeTo(afterPreICOStart)

    await inst.buy({from: accounts[0], value: 50*Math.pow(10, 18)})
    let raised = await inst.weiRaised.call()
    // assert weiRaised = 50 eth + 50 eth
    assert.equal(raised.toNumber(), n1Cap, "tier I preICO purchase did not issue correct amount")
    tSupply = await token.totalSupply.call()
    a0Balance = await token.balanceOf(accounts[0])
    // assert total = 50 eth * 9130 + 50 eth * 7608 = 836900
    var sum = a0Balance.plus(a1Balance)
    assert.equal(tSupply.toString(10), sum.toString(10), "50 eth purchase did not issue correct amount")
  })

  it("can buy preICO tier II purchase", async function() {
    await inst.buy({from: accounts[0], value: 50*Math.pow(10, 18)})
    let raised = await inst.weiRaised.call()
    // asset weiRaised = 50 eth + 50 eth + 50 eth
    assert.equal(raised.toString(10), n2Cap.toString(10), "tier II preICO purchase did not issue correct amount")
    //
    tSupply = await token.totalSupply.call()
    a0Balance = await token.balanceOf(accounts[0])
    // assert total = 50 eth * 9130 + 50 eth * 7608 + 50 eth * 6521 = 1 162 950
    var sum = nPresale.plus(n1).plus(n2)
    assert.equal(tSupply.toString(10), sum.toString(10), "50 eth purchase did not issue correct amount")
  })

  it("can buy preICO tier III purchase", async function() {
    await inst.buy({from: accounts[0], value: 50*Math.pow(10, 18)})
    let raised = await inst.weiRaised.call()
    // asset weiRaised = 50 eth + 50 eth + 50 eth + 50eth
    assert.equal(raised.toString(10), n3Cap.toString(10), "tier III preICO purchase did not issue correct amount")
    //
    tSupply = await token.totalSupply.call()
    a0Balance = await token.balanceOf(accounts[0])
    // assert total = 50 eth * 9130 + 50 eth * 4565 + 50 eth * 6521 + 50 eth * 5706
    var sum = nPresale.plus(n1).plus(n2).plus(n3)
    assert.equal(tSupply.toString(10), sum.toString(10), "50 eth purchase did not issue correct amount")
  })

  it("can buy preICO tier IV purchase", async function() {
    await inst.buy({from: accounts[0], value: 50*Math.pow(10, 18)})
    let raised = await inst.weiRaised.call()
    // asset weiRaised = 50 eth + 50 eth + 50 eth + 50 eth + 50 eth
    assert.equal(raised.toString(10), n4Cap.toString(10), "tier IV preICO purchase did not issue correct amount")
    //
    tSupply = await token.totalSupply.call()
    a0Balance = await token.balanceOf(accounts[0])
    // assert total = 50 eth * 9130 + 50 eth * 4565 + 50 eth * 6521 + 50 eth * 5706 + 50 eth * 5476
    var sum = nPresale.plus(n1).plus(n2).plus(n3).plus(n4)
    assert.equal(tSupply.toString(10), sum.toString(10), "50 eth purchase did not issue correct amount")
  })

  it("can buy preICO tier V purchase", async function() {
    await inst.buy({from: accounts[0], value: 75*Math.pow(10, 18)})
    let raised = await inst.weiRaised.call()
    // asset weiRaised = 50 eth + 50 eth + 50 eth + 50 eth + 50 eth + 75 eth
    assert.equal(raised.toString(10), n5Cap.toString(10), "tier V preICO purchase did not issue correct amount")
    //
    tSupply = await token.totalSupply.call()
    a0Balance = await token.balanceOf(accounts[0])
    // assert total = 50 eth * 9130 + 50 eth * 4565 + 50 eth * 6521 + 50 eth * 5706 + 50 eth * 5476 + 75 * 5072
    var sum = nPresale.plus(n1).plus(n2).plus(n3).plus(n4).plus(n5)
    assert.equal(tSupply.toString(10), sum.toString(10), "75 eth purchase did not issue correct amount")
  })

  it("can buy preICO tier VI purchase", async function() {
    await inst.buy({from: accounts[0], value: 100*Math.pow(10, 18)})
    let raised = await inst.weiRaised.call()
    // asset weiRaised = 50 eth + 50 eth + 50 eth + 50 eth + 50 eth + 75 eth + 100 eth
    assert.equal(raised.toString(10), n6Cap.toString(10), "tier VI preICO purchase did not issue correct amount")
    //
    tSupply = await token.totalSupply.call()
    a0Balance = await token.balanceOf(accounts[0])
    // assert total = 50 eth * 9130 + 50 eth * 4565 + 50 eth * 6521 + 50 eth * 5706 + 50 eth * 5476 + 75 * 5072 + 100 * 4805
    var sum = nPresale.plus(n1).plus(n2).plus(n3).plus(n4).plus(n5).plus(n6)
    assert.equal(tSupply.toString(10), sum.toString(10), "100 eth purchase did not issue correct amount")
  })

  it("can buy ICO tier purchase", async function() {
    let afterICOStart = _startTime + duration.seconds(1)
    await increaseTimeTo(afterICOStart)

    await inst.buy({from: accounts[0], value: 1575*Math.pow(10, 17)})
    let raised = await inst.weiRaised.call()
    // asset weiRaised = 50 eth + 50 eth + 50 eth + 50 eth + 50 eth + 75 eth + 100 eth + 157.5 eth
    assert.equal(raised.toString(10), nICOCap.toString(10), "tier ICO purchase did not issue correct amount")
    //
    tSupply = await token.totalSupply.call()
    a0Balance = await token.balanceOf(accounts[0])
    // assert total = 50 eth * 9130 + 50 eth * 4565 + 50 eth * 6521 + 50 eth * 5706 + 50 eth * 5476 + 75 * 5072 + 100 * 4805 + 157.5 eth * 4565
    var sum = nPresale.plus(n1).plus(n2).plus(n3).plus(n4).plus(n5).plus(n6).plus(nICO)
    assert.equal(tSupply.toString(10), sum.toString(10), "157.5 eth purchase did not issue correct amount")
  })

  it("has correct purchaser count", async function() {
    let purchased = await inst.purchaserCount.call()
    assert(purchased.toNumber(), 8)
  })

  // it("can buy up to the presale cap", async function() {
  //   let raised = await inst.weiRaised.call()
  //   pt = nPresaleCap.minus(raised)
  //   await inst.buy({from: accounts[1], value: pt})
  //   raised = await inst.weiRaised.call()
  //   assert(raised.toString(10), p.toString(10))
  //
  //   let bal = await token.balanceOf(accounts[1])
  //   assert(bal, new BigNumber(20000*1456).plus(pt.mul(1456)))
  // })

  // it("can't buy if presale cap is reached", async function() {
  //   let events = inst.allEvents();
  //   await inst.buy({from: accounts[0], value: 1})
  //   let raised = await inst.weiRaised.call()
  //   // assert weiRaised = presale total
  //   assert.equal(raised.toString(10), p.toString(10), "presale cap reached purchase did not issue correct amount")
  //
  //   tSupply = await token.totalSupply.call()
  //   let purchased = await token.balanceOf(accounts[0])
  //   // assert total = 75 eth * 1164 + 150 eth * 1294 + 300 eth * 1371
  //   var amount = web3.fromWei(purchased.toNumber())
  //   assert.equal(amount, (75*1164)+(150*1294)+(300*1371), "over cap eth purchase did not issue correct amount")
  //   var test = pt
  //   test = test.mul(1456)
  //   test = test.plus(n1.mul(1164)).plus(n2.mul(1294)).plus(n3.mul(1371)).plus(n4.mul(1456))
  //   // assert total tokens = 75 eth * 1164 + 150 eth * 1294 + 300 eth * 1371 + remaining wei * 1456
  //   assert.equal(tSupply.toString(10), test.toString(10), "totalSupply incorrect")
  // })
  //
  // it("can buy regular sale purchase", async function() {
  //   let afterStart = _startTime + duration.seconds(1)
  //   await increaseTimeTo(afterStart)
  //
  //   await inst.buy({from: accounts[0], value: 1*Math.pow(10, 18)})
  //   let raised = await inst.weiRaised.call()
  //   // assert weiRaised = 20000 + 75 eth + 150 eth + 300 eth + 1 eth + presale cap difference
  //   var s = n1.plus(n2).plus(n3).plus(n4).plus(n5).plus(pt)
  //   assert.equal(raised.toString(10), s.toString(10), "presale cap reached purchase did not issue correct amount")
  //
  //   tSupply = await token.totalSupply.call()
  //   let purchased = await token.balanceOf(accounts[0])
  //   // assert total = 50 eth * 2164 + 100 eth * 3164
  //   var amount = web3.fromWei(purchased.toNumber())
  //   assert.equal(amount, (75*1164)+(150*1294)+(300*1371)+1164, "1 eth purchase did not issue correct amount")
  // })
  //
  // it("can buy up to the sale cap", async function() {
  //   let raised = await inst.weiRaised.call()
  //   tt = t.minus(raised)
  //   await inst.buy({from: accounts[1], value: tt})
  //   raised = await inst.weiRaised.call()
  //   assert(raised.toString(10), t.toString(10))
  //
  //   let bal = await token.balanceOf(accounts[1])
  //   assert(bal, new BigNumber(20000*1456).plus(tt.mul(1164)).plus(pt.mul(1456)))
  // })
  //
  // it("can't buy if sale cap is reached", async function() {
  //   await inst.buy({from: accounts[0], value: 1})
  //   let raised = await inst.weiRaised.call()
  //   // assert weiRaised = 20000 + 75 eth + 150 eth + 300 eth + 1 eth + presale cap difference + sale cap
  //   var s = n1.plus(n2).plus(n3).plus(n4).plus(n5).plus(pt).plus(tt)
  //   assert.equal(raised.toString(10), s.toString(10), "sale cap reached purchase did not issue correct amount")
  //
  //   tSupply = await token.totalSupply.call()
  //   let purchased = await token.balanceOf(accounts[0])
  //   // assert total = 50 eth * 2164 + 100 eth * 3164
  //   var amount = web3.fromWei(purchased.toNumber())
  //   assert.equal(amount, (75*1164)+(150*1294)+(300*1371)+1164, "over cap eth purchase did not issue correct amount")
  // })
  //
  // it("can't buy after sale end time", async function() {
  //   let afterEnd = _endTime + duration.seconds(1)
  //   await increaseTimeTo(afterEnd)
  //
  //   await inst.buy({from: accounts[0], value: 20000})
  //   let raised = await inst.weiRaised.call()
  //   // assert weiRaised = 20000 + 75 eth + 150 eth + 300 eth + 1 eth + presale cap difference + sale cap
  //   var s = n1.plus(n2).plus(n3).plus(n4).plus(n5).plus(pt).plus(tt)
  //   assert.equal(raised.toString(10), s.toString(10), "presale cap reached purchase did not issue correct amount")
  //
  //   let purchased = await token.balanceOf(accounts[0])
  //   var amount = web3.fromWei(purchased.toNumber())
  //   assert.equal(amount, (75*1164)+(150*1294)+(300*1371)+1164, "after time end did not issue correct amount")
  // })
  //
  // it("owner can finalize", function() {
  //   return inst.finalize({from: accounts[0]}).then(function(res) {
  //     return inst.isFinalized.call()
  //   }).then(function(final) {
  //     assert.equal(final, true, "Finalized was not set to true when called")
  //     return token.totalSupply.call()
  //   }).then(function(total) {
  //     // assert final supply equals pi
  //     assert.equal(web3.fromWei(total.toNumber()), 314159265, "Finalize did not issue correct tokens")
  //     return token.mintingFinished.call()
  //   }).then(function(doneMinting) {
  //     assert.equal(doneMinting, true, "finished minting was not set correctly")
  //     return token.owner.call()
  //   }).then(function(owner) {
  //     // assert that the token is now owned by master account
  //     assert.equal(owner, accounts[0], "ownership was not transferred correctly")
  //     return token.balanceOf(accounts[0])
  //   }).then(function(bal) {
  //     // assert that the owner remaining ~40% of tokens were issued in finalization.
  //     assert(web3.fromWei(bal.toNumber()), 107705112.5)
  //   })
  // })
  //
  // it("token is released for transfer", async function() {
  //   let released = await token.released.call()
  //   assert(released, true)
  // })
  //
  // it("can transfer", async function() {
  //   a0Balance = await token.balanceOf(accounts[0])
  //   a1Balance = await token.balanceOf(accounts[1])
  //   await token.transfer(accounts[0], 20000, {from: accounts[1]})
  //   let hold = a1Balance.minus(20000)
  //   let add = a0Balance.plus(20000)
  //   a1Balance = await token.balanceOf(accounts[1])
  //   // assert total = 20000 * 1456
  //   assert.equal(a1Balance.toNumber(), hold.toNumber(), "did not transfer correct amount")
  // })
})
