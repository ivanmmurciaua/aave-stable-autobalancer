# AAVE Stable Autobalancer

![Node.js Compatibility](https://img.shields.io/badge/Node.js-%3E%3D%2021.7.3-brightgreen)

> **NOTE**: If you're using a previous NodeJS version 21.7.3, you MUST install dotenv and imports.

## Usage

Run 
```bash
npm i
```

Run 
```bash 
cp .env.example .env
```

Change the values in `.env` and network & chain in `config.js`

Run
```bash
node --env-file .env index.js
```

## TODO

**Before all, check which is the best way to assure a good swap with sufficient liquidity, now and in the future of current and bestOption**

Is possible a swap btw current and bestOption?. If yes, check how many bestOption I'll receive after a swap with which % of slippage. Gas and current balance substract result in % format, will decide the execution.

- Withdraw
    - asset         : eth address underlying asset
    - amount        : amount in wei
    - to            : currentAddress

- Supply
    - asset         : eth address underlying asset
    - amount        : amount in wei
    - onBehalfOf    : currentAddress
    - referralCode  : 0

- Check if swap is possible before wd. If swap receive amount >2%, don't wd.


Approvals:
- Supply: approve + supply.
- Swap: approve + swap.

Costs:
- Approve ~$0,009
- Supply ~$0,05
- Swap ~$0,009