import { ethers, getNamedAccounts, network } from 'hardhat'
import { networkConfig } from '../helper-hardhat-config'

export const AMOUNT = ethers.utils.parseEther("0.02") 

export async function getWETH() {
    const { deployer } = await getNamedAccounts()

    // contract address: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 for mainnet weth
    const iWeth = await ethers.getContractAt(
        "IWeth",
        // networkConfig[network.config!.chainId!].wethToken!,
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    )
    const txResponse = await iWeth.deposit({value: AMOUNT})
    await txResponse.wait(1)
    const wethBalance = await iWeth.balanceOf(deployer)
    console.log(`Balance: ${wethBalance.toString()} WETH`)
}
