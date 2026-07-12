import { PredictionValue } from '../../domain/prediction-value';

export interface PredictionModelPort {
  id: string;
  name: string;
  version: string;
  predict(
    features: Record<string, number>,
    odds: number[],
  ): Promise<PredictionValue>;
}

export const PredictionModelPortToken = Symbol('PredictionModelPort');
