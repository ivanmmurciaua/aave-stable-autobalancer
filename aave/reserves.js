const { UiPoolDataProvider } = require('@aave/contract-helpers');
const { network, chain, provider } = require('../config');

const ERC20 = require("@openzeppelin/contracts/build/contracts/ERC20.json");
const aave = require('@aave/math-utils');
const ethers = require('ethers');

// View contract used to fetch all reserves data (including market base currency data), and user reserves
const poolDataProviderContract = new UiPoolDataProvider({
    uiPoolDataProviderAddress: network.UI_POOL_DATA_PROVIDER,
    provider,
    chainId: chain,
});

const protocolReserves = async () => {
    // Object containing array of pool reserves and market base currency data
    // { reservesArray, baseCurrencyData }
    const protocolReserves = await poolDataProviderContract.getReservesHumanized({
        lendingPoolAddressProvider: network.POOL_ADDRESSES_PROVIDER,
    });

    const currentTimestamp = Date.now();

    return aave.formatReserves({
        reserves: protocolReserves.reservesData,
        currentTimestamp,
        marketReferenceCurrencyDecimals:
            protocolReserves.baseCurrencyData.marketReferenceCurrencyDecimals,
        marketReferencePriceInUsd: protocolReserves.baseCurrencyData.marketReferenceCurrencyPriceInUsd,
    });
}

const userReserves = async (account) => {
    // Object containing array or users aave positions and active eMode category
    // { userReserves, userEmodeCategoryId }
    return await poolDataProviderContract.getUserReservesHumanized({
        lendingPoolAddressProvider: network.POOL_ADDRESSES_PROVIDER,
        user: account,
    });
}

const aToken = (underlyingAsset) => {
    return Object.entries(network.ASSETS).find(([key, asset]) => 
        asset.UNDERLYING.toLowerCase() === underlyingAsset.toLowerCase()
    );
}

const asset = (aTokenAddress) => {
    return Object.entries(network.ASSETS).find(([key, asset]) => 
        asset.A_TOKEN.toLowerCase() === aTokenAddress.toLowerCase()
    );
}

const assetName = (id)  => {
    const [name,] = Object.entries(network.ASSETS).find(([key, asset]) => 
        asset.id === id
    );
    return name;
}

const aTokenBalance = async (aTokenData, userAccount) => {
    const contract = new ethers.Contract(aTokenData.A_TOKEN, ERC20.abi, provider);

    try{
        const balance = await contract.balanceOf(userAccount);
        return ethers.utils.formatUnits(balance, aTokenData.decimals)
    }
    catch(error){
        console.error("Error retrieving aToken balance")
        return 0;
    }
}

module.exports = {
    protocolReserves, 
    userReserves,
    aToken,
    asset,
    assetName,
    aTokenBalance
}