const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Nft Marketplace Unit Tests", function () {
        let nftMarketplace, nftMarketplaceContract, basicNft, basicNftContract
        const PRICE = ethers.parseEther("0.1")
        const TOKEN_ID = 0

        beforeEach(async () => {
            accounts = await ethers.getSigners() // could also do with getNamedAccounts
            deployer = accounts[0]
            user = accounts[1]
            await deployments.fixture(["all"])

            const nftMarketplaceContractDeployment = await deployments.get("NftMarketplace")
            nftMarketplaceContract = await ethers.getContractAt(
                nftMarketplaceContractDeployment.abi,
                nftMarketplaceContractDeployment.address
            )
            nftMarketplace = nftMarketplaceContract.connect(deployer)

            const basicNftContractDeployment = await deployments.get("BasicNft")
            basicNftContract = await ethers.getContractAt(
                basicNftContractDeployment.abi,
                basicNftContractDeployment.address
            )
            basicNft = basicNftContract.connect(deployer)

            await basicNft.mintNft()
            await basicNft.approve(nftMarketplaceContract.target, TOKEN_ID)
        })

        describe("listItem", function () {
            it("emits an event after listing an item", async function () {
                expect(await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)).to.emit(
                    "ItemListed"
                )
            })
            it("exclusively items that haven't been listed", async function () {
                await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                await expect(
                    nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__AlreadyListed")
            })
            it("exclusively allows owners to list", async function () {
                nftMarketplace = nftMarketplaceContract.connect(user)
                await basicNft.approve(user.address, TOKEN_ID)
                await expect(
                    nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotOwner")
            })
            it("needs approvals to list item", async function () {
                await basicNft.approve(accounts[2].address, TOKEN_ID)
                await expect(
                    nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotApprovedForMarketplace")
            })
            it("Updates listing with seller and price", async function () {
                await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                const listing = await nftMarketplace.getListing(basicNft.target, TOKEN_ID)
                assert.equal(PRICE.toString(), listing.price.toString())
                assert.equal(deployer.address, listing.seller.toString())
            })
            it("reverts if the price be 0", async () => {
                const ZERO_PRICE = ethers.parseEther("0")
                await expect(
                    nftMarketplace.listItem(basicNft.target, TOKEN_ID, ZERO_PRICE)
                ).revertedWithCustomError(nftMarketplace, "NftMarketplace__PriceMustBeAboveZero")
            })
        })
        describe("cancelListing", function () {
            it("reverts if there is no listing", async function () {
                await expect(
                    nftMarketplace.cancelItem(basicNft.target, TOKEN_ID)
                ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed")
            })
            it("reverts if anyone but the owner tries to call", async function () {
                await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                nftMarketplace = nftMarketplaceContract.connect(user)
                await basicNft.approve(user.address, TOKEN_ID)
                await expect(
                    nftMarketplace.cancelItem(basicNft.target, TOKEN_ID)
                ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotOwner")
            })
            it("emits event and removes listing", async function () {
                await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                expect(await nftMarketplace.cancelItem(basicNft.target, TOKEN_ID)).to.emit(
                    "ItemCanceled"
                )
                const listing = await nftMarketplace.getListing(basicNft.target, TOKEN_ID)
                assert.equal("0", listing.price.toString())
            })
        })
        describe("buyItem", function () {
            it("reverts if the item isn't listed", async function () {
                await expect(
                    nftMarketplace.buyItem(basicNft.target, TOKEN_ID)
                ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed")
            })
            it("reverts if the price isn't met", async function () {
                await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                await expect(
                    nftMarketplace.buyItem(basicNft.target, TOKEN_ID)
                ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__PriceNotMet")
            })
            it("transfers the nft to the buyer and updates internal proceeds record", async function () {
                await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                nftMarketplace = nftMarketplaceContract.connect(user)
                expect(
                    await nftMarketplace.buyItem(basicNft.target, TOKEN_ID, { value: PRICE })
                ).to.emit("ItemBought")
                const newOwner = await basicNft.ownerOf(TOKEN_ID)
                const deployerProceeds = await nftMarketplace.getProceeds(deployer.address)
                assert.equal(user.address, newOwner.toString())
                assert.equal(PRICE.toString(), deployerProceeds.toString())
            })
        })
        describe("updateListing", function () {
            it("must be owner and listed", async function () {
                await expect(
                    nftMarketplace.updateListing(basicNft.target, TOKEN_ID, PRICE)
                ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed")
                await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                nftMarketplace = nftMarketplaceContract.connect(user)
                await expect(
                    nftMarketplace.updateListing(basicNft.target, TOKEN_ID, PRICE)
                ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotOwner")
            })
            it("reverts if new price is 0", async function () {
                const updatedPrice = ethers.parseEther("0")
                await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                await expect(nftMarketplace.updateListing(basicNft.target, TOKEN_ID, updatedPrice)).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__PriceMustBeAboveZero")
            })
            it("updates the price of the item", async function () {
                const updatedPrice = ethers.parseEther("0.2")
                await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                expect(
                    await nftMarketplace.updateListing(basicNft.target, TOKEN_ID, updatedPrice)
                ).to.emit("ItemListed")
                const listing = await nftMarketplace.getListing(basicNft.target, TOKEN_ID)
                assert.equal(updatedPrice.toString(), listing.price.toString())
            })
        })
        describe("withdrawProceeds", function () {
            it("doesn't allow 0 proceed withdrawls", async function () {
                await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NoProceeds")
            })
            it("withdraws proceeds", async function () {
                await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                nftMarketplace = nftMarketplaceContract.connect(user)
                await nftMarketplace.buyItem(basicNft.target, TOKEN_ID, { value: PRICE })
                nftMarketplace = nftMarketplaceContract.connect(deployer)

                const deployerProceedsBefore = await nftMarketplace.getProceeds(deployer.address)
                const deployerBalanceBefore = await ethers.provider.getBalance(deployer.address)
                const txResponse = await nftMarketplace.withdrawProceeds()
                const transactionReceipt = await txResponse.wait(1)
                const { gasUsed, gasPrice } = transactionReceipt
                const gasCost = gasUsed * gasPrice
                const deployerBalanceAfter = await ethers.provider.getBalance(deployer.address)

                assert.equal(
                    (deployerProceedsBefore + deployerBalanceBefore).toString(),
                    (deployerBalanceAfter + gasCost).toString()
                )
            })
        })
    })
