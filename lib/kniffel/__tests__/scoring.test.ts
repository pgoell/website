import { describe, expect, it } from "vitest";
import {
  calculateScore,
  countDice,
  getDiceValues,
  getGrandTotal,
  getLowerTotal,
  getUpperBonus,
  getUpperTotal,
  getWinners,
  hasNOfAKind,
  isFullHouse,
  isKniffel,
  isLargeStraight,
  isPlayerComplete,
  isSmallStraight,
  scoreChance,
  scoreFourOfAKind,
  scoreFullHouse,
  scoreKniffel,
  scoreLargeStraight,
  scoreSmallStraight,
  scoreThreeOfAKind,
  scoreUpper,
  sumDice,
} from "../scoring";
import type { DieState, Player, ScoreCategory } from "../types";

function createDice(values: number[]): DieState[] {
  return values.map((value) => ({ value, held: false }));
}

function createPlayer(
  scores: Partial<Record<ScoreCategory, number | null>>,
): Player {
  const defaultScores: Record<ScoreCategory, number | null> = {
    ones: null,
    twos: null,
    threes: null,
    fours: null,
    fives: null,
    sixes: null,
    threeOfAKind: null,
    fourOfAKind: null,
    fullHouse: null,
    smallStraight: null,
    largeStraight: null,
    kniffel: null,
    chance: null,
  };
  return {
    id: "test",
    name: "Test Player",
    scores: { ...defaultScores, ...scores },
  };
}

describe("getDiceValues", () => {
  it("extracts values from dice", () => {
    const dice = createDice([1, 2, 3, 4, 5]);
    expect(getDiceValues(dice)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("countDice", () => {
  it("counts occurrences of each value", () => {
    expect(countDice([1, 1, 2, 3, 3])).toEqual({ 1: 2, 2: 1, 3: 2 });
  });

  it("handles all same values", () => {
    expect(countDice([5, 5, 5, 5, 5])).toEqual({ 5: 5 });
  });
});

describe("sumDice", () => {
  it("sums all values", () => {
    expect(sumDice([1, 2, 3, 4, 5])).toBe(15);
  });
});

describe("scoreUpper", () => {
  it("scores ones correctly", () => {
    expect(scoreUpper([1, 1, 2, 3, 4], 1)).toBe(2);
  });

  it("scores sixes correctly", () => {
    expect(scoreUpper([6, 6, 6, 1, 2], 6)).toBe(18);
  });

  it("returns 0 when no matches", () => {
    expect(scoreUpper([2, 3, 4, 5, 6], 1)).toBe(0);
  });
});

describe("hasNOfAKind", () => {
  it("detects three of a kind", () => {
    expect(hasNOfAKind([3, 3, 3, 1, 2], 3)).toBe(true);
    expect(hasNOfAKind([3, 3, 1, 1, 2], 3)).toBe(false);
  });

  it("detects four of a kind", () => {
    expect(hasNOfAKind([4, 4, 4, 4, 1], 4)).toBe(true);
    expect(hasNOfAKind([4, 4, 4, 1, 2], 4)).toBe(false);
  });

  it("detects five of a kind (Kniffel)", () => {
    expect(hasNOfAKind([5, 5, 5, 5, 5], 5)).toBe(true);
    expect(hasNOfAKind([5, 5, 5, 5, 1], 5)).toBe(false);
  });
});

describe("scoreThreeOfAKind", () => {
  it("returns sum when valid", () => {
    expect(scoreThreeOfAKind([3, 3, 3, 1, 2])).toBe(12);
  });

  it("returns 0 when invalid", () => {
    expect(scoreThreeOfAKind([3, 3, 1, 1, 2])).toBe(0);
  });
});

describe("scoreFourOfAKind", () => {
  it("returns sum when valid", () => {
    expect(scoreFourOfAKind([4, 4, 4, 4, 1])).toBe(17);
  });

  it("returns 0 when invalid", () => {
    expect(scoreFourOfAKind([4, 4, 4, 1, 2])).toBe(0);
  });
});

describe("isFullHouse", () => {
  it("detects full house", () => {
    expect(isFullHouse([2, 2, 3, 3, 3])).toBe(true);
  });

  it("rejects non-full house", () => {
    expect(isFullHouse([2, 2, 2, 3, 3])).toBe(true); // This is also valid
    expect(isFullHouse([2, 2, 3, 4, 5])).toBe(false);
    expect(isFullHouse([1, 1, 1, 1, 1])).toBe(false); // All same is not full house
  });
});

describe("scoreFullHouse", () => {
  it("returns 25 when valid", () => {
    expect(scoreFullHouse([2, 2, 3, 3, 3])).toBe(25);
  });

  it("returns 0 when invalid", () => {
    expect(scoreFullHouse([2, 2, 3, 4, 5])).toBe(0);
  });
});

describe("isSmallStraight", () => {
  it("detects 1-2-3-4 straight", () => {
    expect(isSmallStraight([1, 2, 3, 4, 6])).toBe(true);
  });

  it("detects 2-3-4-5 straight", () => {
    expect(isSmallStraight([2, 3, 4, 5, 1])).toBe(true);
  });

  it("detects 3-4-5-6 straight", () => {
    expect(isSmallStraight([3, 4, 5, 6, 1])).toBe(true);
  });

  it("detects straight with duplicate", () => {
    expect(isSmallStraight([1, 2, 3, 4, 4])).toBe(true);
  });

  it("rejects non-straight", () => {
    expect(isSmallStraight([1, 2, 3, 5, 6])).toBe(false);
  });
});

describe("scoreSmallStraight", () => {
  it("returns 30 when valid", () => {
    expect(scoreSmallStraight([1, 2, 3, 4, 6])).toBe(30);
  });

  it("returns 0 when invalid", () => {
    expect(scoreSmallStraight([1, 2, 3, 5, 6])).toBe(0);
  });
});

describe("isLargeStraight", () => {
  it("detects 1-2-3-4-5 straight", () => {
    expect(isLargeStraight([1, 2, 3, 4, 5])).toBe(true);
    expect(isLargeStraight([5, 4, 3, 2, 1])).toBe(true); // unordered
  });

  it("detects 2-3-4-5-6 straight", () => {
    expect(isLargeStraight([2, 3, 4, 5, 6])).toBe(true);
    expect(isLargeStraight([6, 5, 4, 3, 2])).toBe(true); // unordered
  });

  it("rejects non-large-straight", () => {
    expect(isLargeStraight([1, 2, 3, 4, 6])).toBe(false);
  });
});

describe("scoreLargeStraight", () => {
  it("returns 40 when valid", () => {
    expect(scoreLargeStraight([1, 2, 3, 4, 5])).toBe(40);
  });

  it("returns 0 when invalid", () => {
    expect(scoreLargeStraight([1, 2, 3, 4, 6])).toBe(0);
  });
});

describe("isKniffel", () => {
  it("detects Kniffel", () => {
    expect(isKniffel([6, 6, 6, 6, 6])).toBe(true);
  });

  it("rejects non-Kniffel", () => {
    expect(isKniffel([6, 6, 6, 6, 5])).toBe(false);
  });
});

describe("scoreKniffel", () => {
  it("returns 50 when valid", () => {
    expect(scoreKniffel([6, 6, 6, 6, 6])).toBe(50);
  });

  it("returns 0 when invalid", () => {
    expect(scoreKniffel([6, 6, 6, 6, 5])).toBe(0);
  });
});

describe("scoreChance", () => {
  it("returns sum of all dice", () => {
    expect(scoreChance([1, 2, 3, 4, 5])).toBe(15);
    expect(scoreChance([6, 6, 6, 6, 6])).toBe(30);
  });
});

describe("calculateScore", () => {
  it("calculates upper section scores", () => {
    const dice = createDice([1, 1, 1, 2, 3]);
    expect(calculateScore("ones", dice)).toBe(3);
    expect(calculateScore("twos", dice)).toBe(2);
    expect(calculateScore("threes", dice)).toBe(3);
    expect(calculateScore("fours", dice)).toBe(0);
  });

  it("calculates lower section scores", () => {
    expect(calculateScore("threeOfAKind", createDice([3, 3, 3, 1, 2]))).toBe(
      12,
    );
    expect(calculateScore("fourOfAKind", createDice([4, 4, 4, 4, 1]))).toBe(17);
    expect(calculateScore("fullHouse", createDice([2, 2, 3, 3, 3]))).toBe(25);
    expect(calculateScore("smallStraight", createDice([1, 2, 3, 4, 6]))).toBe(
      30,
    );
    expect(calculateScore("largeStraight", createDice([1, 2, 3, 4, 5]))).toBe(
      40,
    );
    expect(calculateScore("kniffel", createDice([5, 5, 5, 5, 5]))).toBe(50);
    expect(calculateScore("chance", createDice([1, 2, 3, 4, 5]))).toBe(15);
  });
});

describe("getUpperTotal", () => {
  it("sums upper section scores", () => {
    const player = createPlayer({
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18,
    });
    expect(getUpperTotal(player)).toBe(63);
  });

  it("treats null as 0", () => {
    const player = createPlayer({ ones: 3, twos: null });
    expect(getUpperTotal(player)).toBe(3);
  });
});

describe("getUpperBonus", () => {
  it("returns 35 when total >= 63", () => {
    const player = createPlayer({
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18,
    });
    expect(getUpperBonus(player)).toBe(35);
  });

  it("returns 0 when total < 63", () => {
    const player = createPlayer({
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 17,
    });
    expect(getUpperBonus(player)).toBe(0);
  });
});

describe("getLowerTotal", () => {
  it("sums lower section scores", () => {
    const player = createPlayer({
      threeOfAKind: 15,
      fourOfAKind: 20,
      fullHouse: 25,
      smallStraight: 30,
      largeStraight: 40,
      kniffel: 50,
      chance: 20,
    });
    expect(getLowerTotal(player)).toBe(200);
  });
});

describe("getGrandTotal", () => {
  it("sums upper + bonus + lower", () => {
    const player = createPlayer({
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18,
      threeOfAKind: 15,
      fourOfAKind: 20,
      fullHouse: 25,
      smallStraight: 30,
      largeStraight: 40,
      kniffel: 50,
      chance: 20,
    });
    expect(getGrandTotal(player)).toBe(63 + 35 + 200);
  });
});

describe("isPlayerComplete", () => {
  it("returns true when all categories filled", () => {
    const player = createPlayer({
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18,
      threeOfAKind: 15,
      fourOfAKind: 20,
      fullHouse: 25,
      smallStraight: 30,
      largeStraight: 40,
      kniffel: 50,
      chance: 20,
    });
    expect(isPlayerComplete(player)).toBe(true);
  });

  it("returns false when any category is null", () => {
    const player = createPlayer({
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18,
      threeOfAKind: 15,
      fourOfAKind: 20,
      fullHouse: 25,
      smallStraight: 30,
      largeStraight: 40,
      kniffel: null,
      chance: 20,
    });
    expect(isPlayerComplete(player)).toBe(false);
  });
});

describe("getWinners", () => {
  it("returns single winner", () => {
    const players = [
      createPlayer({
        ones: 5,
        twos: 0,
        threes: 0,
        fours: 0,
        fives: 0,
        sixes: 0,
      }),
      createPlayer({
        ones: 3,
        twos: 0,
        threes: 0,
        fours: 0,
        fives: 0,
        sixes: 0,
      }),
    ];
    players[0].name = "Player 1";
    players[1].name = "Player 2";
    const winners = getWinners(players);
    expect(winners).toHaveLength(1);
    expect(winners[0].name).toBe("Player 1");
  });

  it("returns multiple winners on tie", () => {
    const players = [
      createPlayer({
        ones: 5,
        twos: 0,
        threes: 0,
        fours: 0,
        fives: 0,
        sixes: 0,
      }),
      createPlayer({
        ones: 5,
        twos: 0,
        threes: 0,
        fours: 0,
        fives: 0,
        sixes: 0,
      }),
    ];
    players[0].name = "Player 1";
    players[1].name = "Player 2";
    const winners = getWinners(players);
    expect(winners).toHaveLength(2);
  });

  it("returns empty array for no players", () => {
    expect(getWinners([])).toEqual([]);
  });
});
