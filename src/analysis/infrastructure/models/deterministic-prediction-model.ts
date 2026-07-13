import { PredictionModelPort } from '../../application/ports/prediction-model.port';
import { PredictionValue } from '../../domain/prediction-value';

export class DeterministicPredictionModel implements PredictionModelPort {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly version: string,
    private readonly defaultProb = 0.55,
  ) {}

  async predict(
    features: Record<string, number>,
    odds: number[],
  ): Promise<PredictionValue> {
    const raw = this.defaultProb;
    const calibrated = raw * 0.98;
    const marketImplied = odds[0] ? 1 / odds[0] : 0.5;
    const noVig = marketImplied;
    const lower = calibrated - 0.05;
    const upper = calibrated + 0.05;

    return new PredictionValue(
      raw,
      calibrated,
      marketImplied,
      noVig,
      Math.max(0, lower),
      Math.min(1, upper),
      0.9,
      1.0,
    );
  }
}
