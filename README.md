# Lesson 15: NextJS NFT Marketplace - Part I: NFT Marketplace Contracts

Lesson 15 Part I from the Web3, Full Stack Solidity, Smart Contract & Blockchain - Beginner to Expert ULTIMATE
Course | Javascript Edition:
https://github.com/smartcontractkit/full-blockchain-solidity-course-js#lesson-15-nextjs-nft-marketplace-if-you-finish-this-lesson-you-are-a-full-stack-monster

Official code at:
https://github.com/PatrickAlphaC/hardhat-nft-marketplace-fcc

## Plan

Create a decentralized NFT Marketplace:

1. `listItem`: list NFTs on the Marketplace
2. `buyItem`: buy an NFT
3. `cancelItem`: cancel an item listing
4. `updateItem`: update the price for an item
5. `withdrawProceeds`: withdraw payments for my NFTs

## Notes

* using `hardhat-toolbox` instead of `hardhat-waffle`
  * which forces the usage of `ethers` version 6 instead of version 5 
* using `@openzeppelin/contracts` version 5 instead of 4
  * `ReentrancyGuard` under `utils` instead of `security`
* replaced (this and similar)
    ```javascript
    basicNft = await ethers.getContract("BasicNft")
    ```
  with
    ```javascript
    const basicNftDeployment = await deployments.get("BasicNft")
    basicNft = await ethers.getContractAt(
        basicNftDeployment.abi,
        basicNftDeployment.address
    )
    ```
* replaced `ethers.utils.parseEther` with `ethers.parseEther`
* replaced `.address` with `.target` on deployed contract instances
* replaced `.revertedWith(<error_class_name>)` with `revertedWithCustomError(<deployed_contract>, <error_class_name>)`
* replace `deployer.getBalance()` with `ethers.provider.getBalance(deployer.address)` 
* replaced `.mul` and `.add` with `*` and `+`
* replaced `effectiveGasPrice` with `gasPrice` in transaction receipt
* replaced `mintTxReceipt.events` with `mintTxReceipt.logs`
 
* using `@openzeppelin/contracts` version 5 instead of 4
  * which required the implementation of `_exists`
* added `Ownable` constructor call to `RandomIpfsNft`:
    ```javascript
    Ownable(msg.sender)
    ```
