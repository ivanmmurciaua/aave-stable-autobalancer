# AAVE Stable Autobalancer

## TODO
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