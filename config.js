const { ChainId } = require('@aave/contract-helpers');
const markets = require('@bgd-labs/aave-address-book');
const ethers  = require('ethers');

// Change this for other chain
const network = markets.AaveV3Arbitrum;
const chain = ChainId.arbitrum_one;

const provider = new ethers.providers.JsonRpcProvider(
    process.env.RPC
);

module.exports = {
    network, 
    chain, 
    provider
}
