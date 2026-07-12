export class PredictionValue {
  constructor(
    public readonly rawModelProbability: number,
    public readonly calibratedProbability: number,
    public readonly marketImpliedProbability: number,
    public readonly noVigMarketProbability: number,
    public readonly probabilityLowerBound: number,
    public readonly probabilityUpperBound: number,
    public readonly modelConfidence: number,
    public readonly dataQualityScore: number,
  ) {
    this.validateProb(rawModelProbability, 'rawModelProbability');
    this.validateProb(calibratedProbability, 'calibratedProbability');
    this.validateProb(marketImpliedProbability, 'marketImpliedProbability');
    this.validateProb(noVigMarketProbability, 'noVigMarketProbability');
    this.validateProb(modelConfidence, 'modelConfidence');
    this.validateProb(dataQualityScore, 'dataQualityScore');

    if (
      !Number.isFinite(probabilityLowerBound) ||
      !Number.isFinite(probabilityUpperBound) ||
      probabilityLowerBound < 0 ||
      probabilityLowerBound > probabilityUpperBound ||
      probabilityUpperBound > 1
    ) {
      throw new Error(
        'Invalid probability bounds: lower bound must be <= upper bound and within [0,1]',
      );
    }
  }

  private validateProb(value: number, name: string): void {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(
        `Value ${name} (${value}) is not a valid probability in [0,1].`,
      );
    }
  }
}
