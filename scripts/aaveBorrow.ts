import { getNamedAccounts, ethers } from "hardhat"
import { AMOUNT, getWETH } from "./getWETH"
import { BigNumber } from "ethers"
import { ILendingPool } from "../typechain-types"

async function main() {
  await getWETH()
  const { deployer } = await getNamedAccounts()

  // Lending Pool Address Provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5

  const lendingPool = await getLendingPool()
  console.log(`LendingPool address ${lendingPool.address}`)

  const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

  // approve function must occur before one deposits
  await approveERC20(wethTokenAddress, lendingPool.address, AMOUNT)
  console.log("Depositing token...")
  await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
  console.log("Deposit has finished successfully")

  // once deposit has gone in, you can proceed to borrow
  // here we find out how much the user can borrow by displaying some stats
  let { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await getBorrowUserData(lendingPool, deployer)

  // now we need to check the value of the eth to dai in which we are borrowing from
  const priceOfDAI = await getDaiPrice()
  // now we have to convert the amount
  const amountDAIToBorrow = availableBorrowsETH.div(priceOfDAI)
  console.log(`The amount DAI you can borrow is: ${amountDAIToBorrow}`)
  const amountDAIToBorrowInWei = ethers.utils.parseEther(
    amountDAIToBorrow.toString()
  )
  const DAIAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
  await burrowDAI(DAIAddress, lendingPool, amountDAIToBorrowInWei, deployer)
  await getBorrowUserData(lendingPool, deployer)
  await repay(amountDAIToBorrowInWei, DAIAddress, lendingPool, deployer)
  console.log("----------")
  await getBorrowUserData(lendingPool, deployer)

  // of course we are still owing some of the interest, so here are the next steps
  // TODO: get some ETH exchanged for DAI and return the amount
}

async function repay(
  amount: BigNumber,
  daiAddress: string,
  lendingPool: ILendingPool,
  account: string
) {
  await approveERC20(daiAddress, lendingPool.address, amount)
  const repay = await lendingPool.repay(daiAddress, amount, 1, account)
  await repay.wait(1)
  console.log("Repaid succeeded")
}

async function burrowDAI(
  daiAddress: string,
  lendingPool: ILendingPool,
  amountDAIToBorrowInWei: BigNumber,
  account: string
) {
  const borrowTx = await lendingPool.borrow(
    daiAddress,
    amountDAIToBorrowInWei,
    1,
    0,
    account
  )
  await borrowTx.wait(1)
  console.log("You have borrowed some DAI")
}

async function getLendingPool() {
  const lendingPoolAddressesProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5"
  )
  const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
  // await lendingPoolAddress .wait(1)
  const lendingPool: ILendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPoolAddress
  )
  return lendingPool
}

async function approveERC20(
  contractAddress: string,
  spenderAddress: string,
  amountToSpend: BigNumber
) {
  const erc20Token = await ethers.getContractAt("IERC20", contractAddress)
  const tx = await erc20Token.approve(spenderAddress, amountToSpend)
  await tx.wait(1)
  console.log(
    `Approved spending ${amountToSpend} for account ${spenderAddress}`
  )
}

async function getDaiPrice() {
  // remember that reading does not need signer while sending does
  const daiETHPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    "0x773616E4d11A78F511299002da57A0a94577F1f4"
  )
  const price = (await daiETHPriceFeed.latestRoundData())[1] //returns answer for the payload, answer is the price data
  console.log(`The DAI/ETH price is ${price.toString()}`)
  return price
}

async function getBorrowUserData(lendingPool: ILendingPool, account: string) {
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account)
  console.log(
    `You currently have ${ethers.utils.parseEther(
      totalCollateralETH.toString()
    )} amount,in ETH, deposited`
  )
  console.log(`The total debt in ETH is ${totalDebtETH}`)
  console.log(`The amount you can borrow ETH is ${availableBorrowsETH}`)
  return { totalCollateralETH, totalDebtETH, availableBorrowsETH }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
