const {
    ChainId, UiPoolDataProvider
}             = require('@aave/contract-helpers');
const markets = require('@bgd-labs/aave-address-book');
const ethers  = require('ethers');
const aave    = require('@aave/math-utils')
const dayjs   = require('dayjs')

const network = markets.AaveV3Arbitrum;
const chain = ChainId.arbitrum_one;

const provider = new ethers.providers.JsonRpcProvider(
    process.env.RPC
);

// User address to fetch data for, insert address here
const currentAccount = process.env.ADDRESS;

// View contract used to fetch all reserves data (including market base currency data), and user reserves
const poolDataProviderContract = new UiPoolDataProvider({
    uiPoolDataProviderAddress: network.UI_POOL_DATA_PROVIDER,
    provider,
    chainId: chain,
});

let protocolReserves;
let myReserves;

async function fetchReserves(){
    // Object containing array of pool reserves and market base currency data
    // { reservesArray, baseCurrencyData }
    protocolReserves = await poolDataProviderContract.getReservesHumanized({
        lendingPoolAddressProvider: network.POOL_ADDRESSES_PROVIDER,
    });

    const reservesArray = protocolReserves.reservesData;
    const baseCurrencyData = protocolReserves.baseCurrencyData;

    const currentTimestamp = dayjs().unix();

    const formattedPoolReserves = aave.formatReserves({
        reserves: reservesArray,
        currentTimestamp,
        marketReferenceCurrencyDecimals:
            baseCurrencyData.marketReferenceCurrencyDecimals,
        marketReferencePriceInUsd: baseCurrencyData.marketReferenceCurrencyPriceInUsd,
    });

    const stable = [
        'Dai Stablecoin',
        'USD Coin (Arb1)',
        'USD₮0',
        'USD Coin',
        'LUSD Stablecoin'
    ];

    // Get APYs
    const supplyAPYs = formattedPoolReserves
    .filter(id => stable.includes(id.name))
    .map(id => ({
        name: id.name,
        symbol: id.symbol,
        supplyAPY: (parseFloat(id.supplyAPY) * 100).toFixed(2) + '%',
        aTokenAddress: id.aTokenAddress
    }));

    console.log(supplyAPYs);

    console.log("\nBest APY")
    const bestSuppyAPY = supplyAPYs.reduce((max, id) => {
        const supplyAPYValue = parseFloat(id.supplyAPY);
        return supplyAPYValue > max.supplyAPY ? { ...id, supplyAPY: supplyAPYValue } : max;
    }, { supplyAPY: 0 });

    console.log(bestSuppyAPY);


}

async function fetchMyReserves() {
    // Object containing array or users aave positions and active eMode category
    // { userReserves, userEmodeCategoryId }
    const userReserves = await poolDataProviderContract.getUserReservesHumanized({
        lendingPoolAddressProvider: network.POOL_ADDRESSES_PROVIDER,
        user: currentAccount,
    });

    myReserves = userReserves.userReserves.filter(reserve => parseFloat(reserve.scaledATokenBalance) > 0);
    
    console.log("\nMy reserves")
    console.log(myReserves);
}
  
fetchReserves();
fetchMyReserves();