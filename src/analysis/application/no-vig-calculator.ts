export interface NoVigResult {
  noVigProbabilities: number[];
  margin: number;
}

export class NoVigCalculator {
  /**
   * Calculates no-vig probabilities for a 2-way market (e.g. Home/Away).
   */
  public static calculateTwoWay(odds: [number, number]): NoVigResult {
    const [o1, o2] = odds;
    if (o1 <= 1 || o2 <= 1) {
      throw new Error('All odds must be strictly greater than 1.');
    }

    const impl1 = 1 / o1;
    const impl2 = 1 / o2;
    const sum = impl1 + impl2;
    const margin = sum - 1;

    return {
      noVigProbabilities: [impl1 / sum, impl2 / sum],
      margin,
    };
  }

  /**
   * Calculates no-vig probabilities for a 3-way market (e.g. 1X2).
   */
  public static calculateThreeWay(odds: [number, number, number]): NoVigResult {
    const [o1, o2, o3] = odds;
    if (o1 <= 1 || o2 <= 1 || o3 <= 1) {
      throw new Error('All odds must be strictly greater than 1.');
    }

    const impl1 = 1 / o1;
    const impl2 = 1 / o2;
    const impl3 = 1 / o3;
    const sum = impl1 + impl2 + impl3;
    const margin = sum - 1;

    return {
      noVigProbabilities: [impl1 / sum, impl2 / sum, impl3 / sum],
      margin,
    };
  }
}
