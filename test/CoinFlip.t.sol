// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/CoinFlip.sol";

contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "ERC20: insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "ERC20: insufficient balance");
        require(allowance[from][msg.sender] >= amount, "ERC20: insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract CoinFlipTest is Test {
    MockUSDC usdc;
    CoinFlip coinFlip;

    address player = makeAddr("player");
    address stranger = makeAddr("stranger");

    uint256 constant BET = 1_000_000;          // 1 USDC
    uint256 constant HOUSE_FUND = 100_000_000;  // 100 USDC
    uint256 constant MIN_BET = 100_000;
    uint256 constant MAX_BET = 10_000_000;

    function setUp() public {
        usdc = new MockUSDC();
        coinFlip = new CoinFlip(address(usdc));

        // Owner (this contract) funds the house
        usdc.mint(address(this), HOUSE_FUND);
        usdc.approve(address(coinFlip), HOUSE_FUND);
        coinFlip.fundHouse(HOUSE_FUND);

        // Give player USDC and unlimited approval
        usdc.mint(player, 50 * BET);
        vm.prank(player);
        usdc.approve(address(coinFlip), type(uint256).max);
    }

    // Predicts the contract's outcome without making any external calls.
    // Pass the current flip count (before the bet) so this is safe inside pranked scope.
    function _predictOutcome(uint256 flipCount) internal view returns (CoinFlip.Side) {
        uint256 random = uint256(
            keccak256(abi.encodePacked(block.timestamp, block.prevrandao, player, flipCount))
        );
        return (random % 2 == 0) ? CoinFlip.Side.Heads : CoinFlip.Side.Tails;
    }

    // -------------------------------------------------------------------------
    // Bet validation
    // -------------------------------------------------------------------------

    function test_RevertBelowMinBet() public {
        vm.prank(player);
        vm.expectRevert("Below minimum bet");
        coinFlip.flip(CoinFlip.Side.Heads, MIN_BET - 1);
    }

    function test_RevertAboveMaxBet() public {
        vm.prank(player);
        vm.expectRevert("Above maximum bet");
        coinFlip.flip(CoinFlip.Side.Heads, MAX_BET + 1);
    }

    // -------------------------------------------------------------------------
    // Win / Loss outcomes
    // -------------------------------------------------------------------------

    function test_WinIncreasesPlayerBalanceByBet() public {
        CoinFlip.Side winningSide = _predictOutcome(0);
        uint256 balanceBefore = usdc.balanceOf(player);

        vm.prank(player);
        CoinFlip.Result result = coinFlip.flip(winningSide, BET);

        assertEq(uint256(result), uint256(CoinFlip.Result.Won));
        // Player paid BET, received 2×BET back → net +BET
        assertEq(usdc.balanceOf(player), balanceBefore + BET);
    }

    function test_LossDecreasesPlayerAndIncreasesHouse() public {
        CoinFlip.Side winningSide = _predictOutcome(0);
        CoinFlip.Side losingSide = winningSide == CoinFlip.Side.Heads
            ? CoinFlip.Side.Tails
            : CoinFlip.Side.Heads;

        uint256 playerBefore = usdc.balanceOf(player);
        uint256 houseBefore = usdc.balanceOf(address(coinFlip));

        vm.prank(player);
        CoinFlip.Result result = coinFlip.flip(losingSide, BET);

        assertEq(uint256(result), uint256(CoinFlip.Result.Lost));
        assertEq(usdc.balanceOf(player), playerBefore - BET);
        assertEq(usdc.balanceOf(address(coinFlip)), houseBefore + BET);
    }

    // -------------------------------------------------------------------------
    // Flip array recording
    // -------------------------------------------------------------------------

    function test_PlayerFlipsArrayRecorded() public {
        // First flip (flipId = 0)
        CoinFlip.Side side0 = _predictOutcome(0);
        vm.prank(player);
        coinFlip.flip(side0, BET);

        uint256[] memory ids = coinFlip.getPlayerFlips(player);
        assertEq(ids.length, 1);
        assertEq(ids[0], 0);

        // Second flip (flipId = 1)
        CoinFlip.Side side1 = _predictOutcome(1);
        vm.prank(player);
        coinFlip.flip(side1, BET);

        ids = coinFlip.getPlayerFlips(player);
        assertEq(ids.length, 2);
        assertEq(ids[1], 1);
    }

    function test_PlayerFlipsNotSharedWithStranger() public {
        CoinFlip.Side side = _predictOutcome(0);
        vm.prank(player);
        coinFlip.flip(side, BET);

        assertEq(coinFlip.getPlayerFlips(stranger).length, 0);
    }

    // -------------------------------------------------------------------------
    // houseBalance
    // -------------------------------------------------------------------------

    function test_HouseBalanceReflectsInitialFund() public view {
        assertEq(coinFlip.houseBalance(), HOUSE_FUND);
    }

    function test_HouseBalanceDecreasesOnPlayerWin() public {
        CoinFlip.Side winningSide = _predictOutcome(0);
        uint256 houseBefore = coinFlip.houseBalance();

        vm.prank(player);
        coinFlip.flip(winningSide, BET);

        // house received BET then paid 2×BET → net -BET
        assertEq(coinFlip.houseBalance(), houseBefore - BET);
    }

    function test_HouseBalanceIncreasesOnPlayerLoss() public {
        CoinFlip.Side winningSide = _predictOutcome(0);
        CoinFlip.Side losingSide = winningSide == CoinFlip.Side.Heads
            ? CoinFlip.Side.Tails
            : CoinFlip.Side.Heads;

        uint256 houseBefore = coinFlip.houseBalance();

        vm.prank(player);
        coinFlip.flip(losingSide, BET);

        assertEq(coinFlip.houseBalance(), houseBefore + BET);
    }

    // -------------------------------------------------------------------------
    // Owner-only: fundHouse / withdrawHouse
    // -------------------------------------------------------------------------

    function test_NonOwnerCannotFundHouse() public {
        usdc.mint(stranger, BET);
        vm.startPrank(stranger);
        usdc.approve(address(coinFlip), BET);
        vm.expectRevert("Only owner");
        coinFlip.fundHouse(BET);
        vm.stopPrank();
    }

    function test_NonOwnerCannotWithdrawHouse() public {
        vm.prank(stranger);
        vm.expectRevert("Only owner");
        coinFlip.withdrawHouse(BET);
    }

    function test_OwnerCanFundHouse() public {
        uint256 before = coinFlip.houseBalance();
        usdc.mint(address(this), BET);
        usdc.approve(address(coinFlip), BET);
        coinFlip.fundHouse(BET);
        assertEq(coinFlip.houseBalance(), before + BET);
    }

    function test_OwnerCanWithdrawHouse() public {
        uint256 before = coinFlip.houseBalance();
        coinFlip.withdrawHouse(BET);
        assertEq(coinFlip.houseBalance(), before - BET);
    }
}
