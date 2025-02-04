const { protocolReserves, userReserves, aTokenBalance, aToken } = require('./aave/reserves');

// User address to fetch data for, insert address here
const currentAccount = process.env.ADDRESS;

const filterStables = (reserves) => {
    const stables = [
        'Dai Stablecoin',
        'USD Coin (Arb1)',
        'USD₮0',
        'USD Coin',
        'LUSD Stablecoin'
    ];

    return reserves
    .filter(id => stables.includes(id.name))
    .map(id => ({
        name: id.name,
        symbol: id.symbol,
        supplyAPY: (parseFloat(id.supplyAPY) * 100).toFixed(2) + '%',
        aTokenAddress: id.aTokenAddress
    }));
}

const getBestAPY = (reserves) => {
    const stables = filterStables(reserves);

    return stables.reduce((max, id) => {
        const supplyAPYValue = parseFloat(id.supplyAPY);
        return supplyAPYValue > max.supplyAPY ? { ...id, supplyAPY: supplyAPYValue } : max;
    }, { supplyAPY: 0 });
}

const fetchProtocolReserves = async () => {
    const reserves = await protocolReserves();
    return reserves;
}

const fetchMyReserves = async () => {
    const reserves = await userReserves(currentAccount);
    return reserves.userReserves.filter(reserve => parseFloat(reserve.scaledATokenBalance) > 0);
}

async function main() {
    const reserves = await fetchProtocolReserves();
    const myReserves = await fetchMyReserves();
    const stables = filterStables(reserves);

    const date = new Date(Date.now());
    console.log(`AAVE Stable APY: ${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`)
    console.log(stables);

    console.log(`\nMy reserves:\n`)
    for (const id of myReserves) {
        ////TRACE: console.log(id)
        const [name ,asset] = await aToken(id.underlyingAsset);
        const balance = await aTokenBalance(asset, currentAccount);
        const apy = stables.find(stable => stable.aTokenAddress === asset.A_TOKEN).supplyAPY;

        ////TRACE: console.log(asset)
        // Is my reserve equals to best APY option?
        const bestOption = getBestAPY(reserves);
        if(asset.A_TOKEN === bestOption.aTokenAddress){
            console.log("You're in the best option")
        }
        else{
            ////TRACE: console.log(bestOption)
            console.log(`- You're in ${name} with a balance of ${balance} and an APY of ${apy}, losing ${(bestOption.supplyAPY - parseFloat(apy)).toFixed(2)}% cuz the best option is ${bestOption.symbol} with an APY of ${bestOption.supplyAPY}%`);
            //TODO: swap if possible
        }
    }
} 

main()