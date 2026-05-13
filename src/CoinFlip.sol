// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract CoinFlip {
    IERC20 public immutable usdc;
    address public owner;

    uint256 public constant MIN_BET = 100_000;       // 0.1 USDC (6 decimals)
    uint256 public constant MAX_BET = 10_000_000;    // 10 USDC

    enum Side { Heads, Tails }
    enum Result { Pending, Won, Lost }

    struct Flip {
        address player;
        uint256 amount;
        Side choice;
        Result result;
        uint256 timestamp;
    }

    Flip[] public flips;
    mapping(address => uint256[]) public playerFlips;

    uint256 public totalWins;
    uint256 public totalLosses;

    event FlipResult(
        uint256 indexed flipId,
        address indexed player,
        uint256 amount,
        Side choice,
        Side outcome,
        Result result
    );

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
        owner = msg.sender;
    }

    function flip(Side choice, uint256 amount) external returns (Result) {
        require(amount >= MIN_BET, "Below minimum bet");
        require(amount <= MAX_BET, "Above maximum bet");
        require(usdc.balanceOf(address(this)) >= amount, "Contract cannot cover payout");

        // Transfer bet from player
        require(usdc.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");

        // Pseudo-random: block info + player + flip count
        uint256 random = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    flips.length
                )
            )
        );

        Side outcome = (random % 2 == 0) ? Side.Heads : Side.Tails;
        Result result;

        if (outcome == choice) {
            // Win: pay 2x bet
            require(usdc.transfer(msg.sender, amount * 2), "Payout failed");
            result = Result.Won;
            totalWins++;
        } else {
            result = Result.Lost;
            totalLosses++;
        }

        uint256 flipId = flips.length;
        flips.push(Flip({
            player: msg.sender,
            amount: amount,
            choice: choice,
            result: result,
            timestamp: block.timestamp
        }));
        playerFlips[msg.sender].push(flipId);

        emit FlipResult(flipId, msg.sender, amount, choice, outcome, result);
        return result;
    }

    function fundHouse(uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        require(usdc.transferFrom(msg.sender, address(this), amount), "Funding failed");
    }

    function withdrawHouse(uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        require(usdc.transfer(msg.sender, amount), "Withdraw failed");
    }

    function getFlipCount() external view returns (uint256) {
        return flips.length;
    }

    function getPlayerFlips(address player) external view returns (uint256[] memory) {
        return playerFlips[player];
    }

    function houseBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
