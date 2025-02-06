const { provider } = require('../config')
const ethers = require('ethers');

const FACTORY_ABI = require('./abis/factory.json')
const QUOTER_ABI  = require('./abis/quoter.json')
const SWAP_ROUTER_ABI = require('./abis/swaprouter.json')
const POOL_ABI = require('./abis/pool.json')
const TOKEN_ABI = require('./abis/weth.json')

const POOL_FACTORY_CONTRACT_ADDRESS = process.env.POOL_FACTORY_CONTRACT_ADDRESS
const QUOTER_CONTRACT_ADDRESS = process.env.QUOTER_CONTRACT_ADDRESS
const SWAP_ROUTER_CONTRACT_ADDRESS = process.env.SWAP_ROUTER_CONTRACT_ADDRESS

const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
const factoryContract = new ethers.Contract(POOL_FACTORY_CONTRACT_ADDRESS, FACTORY_ABI, signer);
const quoterContract = new ethers.Contract(QUOTER_CONTRACT_ADDRESS, QUOTER_ABI, signer)

const WETH = {
    chainId: 42161,
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    isToken: true,
    isNative: true,
    wrapped: true
}
  
const USDC = {
    chainId: 42161,
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    isToken: true,
    isNative: true,
    wrapped: false
}

const balanceOf = async (token) => {
    const tokenContract = new ethers.Contract(token.address, TOKEN_ABI, signer);
    const balance = await tokenContract.balanceOf(signer.address)
    return balance;
}

async function approveToken(token, amount) {
    try {
        const tokenContract = new ethers.Contract(token.address, TOKEN_ABI, signer);

        if(token.symbol === "WETH") {
            if(await balanceOf(token) < amount) {
                console.log("ETH deposit")
                const tx1 = await tokenContract.deposit({ value: amount });
                const receipt = await tx1.wait();
                console.log(receipt.transactionHash)
            }
        }

        if(await tokenContract.allowance(signer.address, SWAP_ROUTER_CONTRACT_ADDRESS) < amount){
            const approveTransaction = await tokenContract.populateTransaction.approve(
                SWAP_ROUTER_CONTRACT_ADDRESS,
                amount
            );
    
            const transactionResponse = await signer.sendTransaction(approveTransaction);
            
            console.log(`-------------------------------`)
            console.log(`Sending Approval Transaction...`)
            console.log(`-------------------------------`)
    
            const receipt = await transactionResponse.wait();
            console.log(`Transaction Sent: ${receipt.transactionHash}`)
            console.log(`-------------------------------`)
        }

    } catch (error) {
        console.error("An error occurred during token approval:", error);
        throw new Error("Token approval failed");
    }
}

async function getPoolInfo(factoryContract, tokenIn, tokenOut) {
    try {
        const poolAddress = await factoryContract.getPool(tokenIn.address, tokenOut.address, 3000);
        if (!poolAddress) {
            throw new Error("Failed to get pool address");
        }
    
        const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
        const [,,fee] = await Promise.all([
            poolContract.token0(),
            poolContract.token1(),
            poolContract.fee(),
        ]);
        return fee;
    }
    catch (error) {
        console.error("An error occurred:", error);
        throw new Error("Pool error");
    }
}

async function quoteAndLogSwap(quoterContract, fee, amountIn) {
    const params = {
        tokenIn: WETH.address,
        tokenOut: USDC.address,
        amountIn: amountIn,
        fee: fee,
        sqrtPriceLimitX96: 0
    }
    
    try {
        const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(params);

        console.log(`-------------------------------`);
        console.log(`Token Swap will result in: ${ethers.utils.formatUnits(quotedAmountOut[0].toString(), USDC.decimals)} ${USDC.symbol} for ${ethers.utils.formatEther(amountIn)} ${WETH.symbol}`);
        const amountOut = ethers.utils.formatUnits(quotedAmountOut[0], USDC.decimals);
        return amountOut;
    } catch (error) {
        console.error('An error occurred while quoting the swap:', error);
    }
}

async function prepareSwapParams(signer, amountIn, amountOut) {
    return {
        tokenIn: WETH.address,
        tokenOut: USDC.address,
        fee: 3000,
        recipient: signer.address,
        deadline: Math.floor(new Date().getTime() / 1000 + 60 * 10),
        amountIn: amountIn,
        amountOutMinimum: amountOut,
        sqrtPriceLimitX96: 0
      }
}

async function executeSwap(swapRouter, params, signer) {
    try {
        const transaction = await swapRouter.populateTransaction.exactInputSingle(params);
        transaction.gasLimit = 8000000;
    
        console.log(transaction)
        const tx = await signer.sendTransaction(transaction);
        const receipt = await tx.wait();
    
        console.log(`-------------------------------`);
        console.log(`Swap completed:`);
        console.log(receipt.transactionHash);
        console.log(`-------------------------------`);
        console.log(`Your new USDC balance: ${ethers.utils.formatUnits(await balanceOf(USDC), USDC.decimals)}`)
    }
    catch (error) {
        console.error("An error occurred during swap:", error);
        throw new Error("Swap failed");
    }
}

async function main(swapAmount) {
    const amountIn = ethers.utils.parseEther(swapAmount.toString());
    
    try {
        console.log(`ETH balance:  ${ethers.utils.formatEther(await provider.getBalance(signer.address))}`)
        console.log(`USDC balance: ${ethers.utils.formatUnits(await balanceOf(USDC), USDC.decimals)}`)
        console.log(`WETH balance: ${ethers.utils.formatUnits(await balanceOf(WETH), WETH.decimals)}`)
        await approveToken(WETH, amountIn);

        const fee = await getPoolInfo(factoryContract, WETH, USDC);
        
        console.log(`-------------------------------`)
        console.log(`Fetching Quote for: ${WETH.symbol} to ${USDC.symbol}`);
        console.log(`-------------------------------`)
        console.log(`Swap Amount: ${ethers.utils.formatEther(amountIn)}`);

        const quotedAmountOut = await quoteAndLogSwap(quoterContract, fee, amountIn);

        const params = await prepareSwapParams(signer, amountIn, quotedAmountOut[0].toString());
        const swapRouter = new ethers.Contract(SWAP_ROUTER_CONTRACT_ADDRESS, SWAP_ROUTER_ABI, signer);
        await executeSwap(swapRouter, params, signer);
    } catch (error) {
        console.error("An error occurred:", error.message);
    }
}

main(1)