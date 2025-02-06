const { protocolReserves, userReserves, aTokenBalance, aToken, asset } = require('./aave/reserves');
const { isProfitable } = require('./uniswap/common');

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
        const [name ,assetInfo] = aToken(id.underlyingAsset);
        const balance = await aTokenBalance(assetInfo, currentAccount);
        const apy = stables.find(stable => stable.aTokenAddress === assetInfo.A_TOKEN).supplyAPY;

        ////TRACE: console.log(assetInfo)
        const bestOption = getBestAPY(reserves);
        if(assetInfo.A_TOKEN === bestOption.aTokenAddress){
            console.log("You're in the best option")
        }
        else{
            ////TRACE: console.log(bestOption)
            console.log(`- You're in ${name} with a balance of ${balance} and an APY of ${apy}, losing ${(bestOption.supplyAPY - parseFloat(apy)).toFixed(2)}% cuz the best option is ${bestOption.symbol} with an APY of ${bestOption.supplyAPY}%`);
            const [,bestAsset] = asset(bestOption.aTokenAddress);

            const [differencial, change] = await isProfitable(assetInfo, bestAsset, balance);
            console.log(`- You're losing ${(bestOption.supplyAPY - parseFloat(apy)).toFixed(2)}% in AAVE and you have a ${change} of ${Math.abs(differencial.toFixed(2))}% from a swap between ${name} and ${bestOption.symbol} in Uniswap\n`)

            const aavedif = parseFloat((bestOption.supplyAPY - parseFloat(apy)).toFixed(2))
            const unidif = parseFloat(Math.abs(differencial.toFixed(2)))

            const decission = (unidif - aavedif) > 0 ? 'It is not worth it for ' : 'It is worth it for ';
            console.log(`${decission} ${Math.abs(unidif - aavedif).toFixed(2)}%\n\n`)

            //TODO: How long would it take you to get it back on a monthly basis if you switch to bestOption?
            //TODO: Floor of your performance.
        }
    }
} 

main()