const { provider } = require('../config');
const ethers = require('ethers');

const FACTORY_ABI = require('./abis/factory.json')
const QUOTER_ABI  = require('./abis/quoter.json')
const POOL_ABI = require('./abis/pool.json');
// //UNUSED: const TOKEN_ABI = require openzeppelin ERC20
// //UNUSED: const { assetName } = require('../aave/reserves');

// //UNUSED: const SWAP_ROUTER_ABI = require('./abis/swaprouter.json')
// //UNUSED: const SWAP_ROUTER_CONTRACT_ADDRESS = process.env.SWAP_ROUTER_CONTRACT_ADDRESS

const POOL_FACTORY_CONTRACT_ADDRESS = process.env.POOL_FACTORY_CONTRACT_ADDRESS
const QUOTER_CONTRACT_ADDRESS = process.env.QUOTER_CONTRACT_ADDRESS

const GLOBAL_FEE = 3000;

const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const factoryContract = new ethers.Contract(POOL_FACTORY_CONTRACT_ADDRESS, FACTORY_ABI, signer);
const quoterContract = new ethers.Contract(QUOTER_CONTRACT_ADDRESS, QUOTER_ABI, signer)

const getPoolInfo = async (currentTokenAddress, bestOptionAddress) => {
    try {
        const poolAddress = await factoryContract.getPool(currentTokenAddress, bestOptionAddress, GLOBAL_FEE);
    
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

async function quoteAndLogSwap(current, best, fee, amountIn) {
    const params = {
        tokenIn: current.UNDERLYING,
        tokenOut: best.UNDERLYING,
        amountIn: amountIn,
        fee: fee,
        sqrtPriceLimitX96: 0 //TODO: get from pool
    }
    
    try {
        const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(params);
        // //TRACE: console.log(`-------------------------------`);
        // //TRACE: console.log(`Token Swap will result in: ${ethers.utils.formatUnits(quotedAmountOut[0].toString(), best.decimals)} ${assetName(best.id)} for ${ethers.utils.formatUnits(amountIn, current.decimals)} ${assetName(current.id)}`);
        const amountOut = ethers.utils.formatUnits(quotedAmountOut[0], best.decimals);
        return amountOut;
    } catch (error) {
        console.error('An error occurred while quoting the swap:', error);
        throw new Error("Swap quoting failed");
    }
}

async function isProfitable(current, best, amount) {
    // //TRACE: console.log(current)
    // //TRACE: console.log(best)
    // //TRACE: console.log(amount)
    const amountIn = ethers.utils.parseUnits(amount.toString(), current.decimals)

    const fee = await getPoolInfo(current.UNDERLYING, best.UNDERLYING);
    // //TRACE: console.log(fee)

    // //TRACE: console.log(`-------------------------------`)
    // //TRACE: console.log(`Fetching Quote for: ${assetName(current.id)} to ${assetName(best.id)}`);
    // //TRACE: console.log(`-------------------------------`)
    // //TRACE: console.log(`Swap Amount: ${amount}`);

    const quotedAmountOut = await quoteAndLogSwap(current, best, fee, amountIn);
    // //TRACE: console.log(quotedAmountOut)

    const differencial = ((quotedAmountOut - amount) / amount) * 100;
    const change = differencial < 0 ? 'loss' : 'gain';
    // //TRACE: console.log(`There are ${Math.abs(differencial.toFixed(2))}% in swap (${change})\n\n\n\n`);

    return [differencial, change]
}

module.exports = {
    isProfitable
}