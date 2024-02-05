const { ethers, deployments } = require("hardhat")

const PRICE = ethers.parseEther("0.1")

async function mintAndList() {
    const nftMarketplaceDeployment = await deployments.get("NftMarketplace")
    const nftMarketplace = await ethers.getContractAt(
        nftMarketplaceDeployment.abi,
        nftMarketplaceDeployment.address
    )
    let contractName = "BasicNft"
    const basicBftDeployment = await deployments.get(contractName)
    const basicNft = await ethers.getContractAt(
        basicBftDeployment.abi,
        basicBftDeployment.address
    )

    console.log("Minting NFT...")
    const mintTx = await basicNft.mintNft()
    const mintTxReceipt = await mintTx.wait(1)
    const tokenId = mintTxReceipt.logs[0].args.tokenId
    console.log("Approving NFT...")
    const approvalTx = await basicNft.approve(nftMarketplace.target, tokenId)
    await approvalTx.wait(1)
    console.log("Listing NFT...")
    const tx = await nftMarketplace.listItem(basicNft.target, tokenId, PRICE)
    await tx.wait(1)
    console.log("NFT Listed!")
}

mintAndList()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
