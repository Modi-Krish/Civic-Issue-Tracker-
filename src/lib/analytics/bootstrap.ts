export interface BootstrapCI {
  mean: number;
  lowerCI: number;
  upperCI: number;
}

export interface PredictionSample {
  isTruePositive: boolean;
  isFalsePositive: boolean;
  isFalseNegative: boolean;
}

/**
 * Computes 95% Bootstrap Confidence Intervals using 1,000 resamples for Precision, Recall, and F1-Score.
 */
export function computeBootstrapCIs(
  samples: PredictionSample[],
  iterations: number = 1000,
  confidenceLevel: number = 0.95
): { precisionCI: BootstrapCI; recallCI: BootstrapCI; f1CI: BootstrapCI } {
  if (samples.length === 0) {
    const zero = { mean: 0, lowerCI: 0, upperCI: 0 };
    return { precisionCI: zero, recallCI: zero, f1CI: zero };
  }

  const precisions: number[] = [];
  const recalls: number[] = [];
  const f1s: number[] = [];

  const n = samples.length;

  for (let iter = 0; iter < iterations; iter++) {
    let tp = 0;
    let fp = 0;
    let fn = 0;

    // Resample with replacement
    for (let i = 0; i < n; i++) {
      const randomIndex = Math.floor(Math.random() * n);
      const sample = samples[randomIndex];
      if (sample.isTruePositive) tp++;
      else if (sample.isFalsePositive) fp++;
      else if (sample.isFalseNegative) fn++;
    }

    const prec = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const rec = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const f1 = (prec + rec) > 0 ? (2 * prec * rec) / (prec + rec) : 0;

    precisions.push(prec);
    recalls.push(rec);
    f1s.push(f1);
  }

  const calcCI = (arr: number[]): BootstrapCI => {
    arr.sort((a, b) => a - b);
    const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
    const alpha = (1 - confidenceLevel) / 2;
    const lowerIndex = Math.floor(arr.length * alpha);
    const upperIndex = Math.min(arr.length - 1, Math.ceil(arr.length * (1 - alpha)));

    return {
      mean: Math.round(mean * 1000) / 1000,
      lowerCI: Math.round(arr[lowerIndex] * 1000) / 1000,
      upperCI: Math.round(arr[upperIndex] * 1000) / 1000,
    };
  };

  return {
    precisionCI: calcCI(precisions),
    recallCI: calcCI(recalls),
    f1CI: calcCI(f1s),
  };
}
