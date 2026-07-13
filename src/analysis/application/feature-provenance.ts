export interface Feature {
  eventId: string;
  featureName: string;
  value: number;
  observedAt: Date;
  availableAt: Date;
  sourceProvider: string;
}

export class FeatureProvenance {
  /**
   * Filter out any features that were not yet available at the point of the analysis cutoff.
   * This completely prevents lookahead bias and data leakage!
   */
  public static filterPointInTime(
    features: Feature[],
    cutoff: Date,
  ): Feature[] {
    return features.filter((f) => f.availableAt.getTime() <= cutoff.getTime());
  }
}
