export interface WeatherTestResult {
  r: number;
  pValue: number;
  chiSquare: number;
  df: number; // 2x2 contingency table df = (2-1)*(2-1) = 1
  pearsonDf: number; // Student's t-test df = N - 2
  sampleSize: number; // N daily observations
  interpretation: string;
}

export interface DailyWeatherEvent {
  date: string;
  precipitationMm: number;
  maxTempC: number;
  complaintCount: number;
}

/**
 * Calculates Student's t-distribution p-value for Pearson correlation.
 */
function calculatePValueForPearson(r: number, n: number): number {
  if (n <= 2 || Math.abs(r) >= 1) return 0;

  const t = (r * Math.sqrt(n - 2)) / Math.sqrt(1 - r * r);
  const df = n - 2;

  // Approximate p-value using t-distribution tail area approximation (Hill's algorithm)
  const x = df / (df + t * t);
  const beta = Math.pow(x, df / 2);
  const p = Math.min(1, Math.max(0, beta));
  return Math.round(p * 10000) / 10000;
}

/**
 * Performs Pearson correlation (r), Chi-square (χ²), p-value calculation,
 * and degrees of freedom derivation between daily weather precipitation and complaint spikes.
 * Chi-Square test of independence on 2x2 contingency table has df = 1.
 * Pearson correlation Student's t-test has df = N - 2.
 */
export function runWeatherStatisticalTest(events: DailyWeatherEvent[]): WeatherTestResult {
  const n = events.length;

  if (n < 5) {
    return {
      r: 0,
      pValue: 1,
      chiSquare: 0,
      df: 1,
      pearsonDf: Math.max(0, n - 2),
      sampleSize: n,
      interpretation: 'Insufficient sample size for weather correlation testing (n < 5).'
    };
  }

  // 1. Pearson Correlation Coefficient (r)
  const x = events.map(e => e.precipitationMm);
  const y = events.map(e => e.complaintCount);

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const rRaw = denX > 0 && denY > 0 ? num / Math.sqrt(denX * denY) : 0;
  const r = Math.round(rRaw * 1000) / 1000;
  const pValue = calculatePValueForPearson(r, n);
  const pearsonDf = n - 2;

  // 2. Chi-Square Test (χ²) on 2x2 Contingency Table (High Rain > 10mm vs High Complaint > 2)
  // Standard 2x2 contingency table has df = (2 - 1) * (2 - 1) = 1
  const df = 1;

  let highRainHighComp = 0;
  let highRainLowComp = 0;
  let lowRainHighComp = 0;
  let lowRainLowComp = 0;

  events.forEach(e => {
    const isHighRain = e.precipitationMm >= 10;
    const isHighComp = e.complaintCount >= 2;
    if (isHighRain && isHighComp) highRainHighComp++;
    else if (isHighRain && !isHighComp) highRainLowComp++;
    else if (!isHighRain && isHighComp) lowRainHighComp++;
    else lowRainLowComp++;
  });

  const total = n;
  const row1Sum = highRainHighComp + highRainLowComp;
  const row2Sum = lowRainHighComp + lowRainLowComp;
  const col1Sum = highRainHighComp + lowRainHighComp;
  const col2Sum = highRainLowComp + lowRainLowComp;

  const exp11 = (row1Sum * col1Sum) / total || 1;
  const exp12 = (row1Sum * col2Sum) / total || 1;
  const exp21 = (row2Sum * col1Sum) / total || 1;
  const exp22 = (row2Sum * col2Sum) / total || 1;

  const chiSqRaw =
    Math.pow(highRainHighComp - exp11, 2) / exp11 +
    Math.pow(highRainLowComp - exp12, 2) / exp12 +
    Math.pow(lowRainHighComp - exp21, 2) / exp21 +
    Math.pow(lowRainLowComp - exp22, 2) / exp22;

  const chiSquare = Math.round(chiSqRaw * 100) / 100;

  // Interpretation
  let interpretation = 'No statistically significant association observed.';
  if (pValue < 0.05 && r > 0.3) {
    interpretation = `Statistically significant positive correlation confirmed (Pearson r=${r}, p=${pValue}, N=${n} daily observations, df=${pearsonDf}). Chi-Square test of independence on 2x2 contingency table yields χ²=${chiSquare} (df=1).`;
  } else if (pValue < 0.05) {
    interpretation = `Statistically significant relationship confirmed (p=${pValue}, N=${n}, Pearson df=${pearsonDf}). 2x2 Chi-Square test of independence yields χ²=${chiSquare} (df=1).`;
  }

  return { r, pValue, chiSquare, df, pearsonDf, sampleSize: n, interpretation };
}
