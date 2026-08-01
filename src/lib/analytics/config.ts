export const ANALYSIS_CONFIG = {
  // How far back to look for historical complaints
  LOOKBACK_MONTHS: 12,

  // Category-specific cluster radii in metres
  CLUSTER_RADIUS_METRES: {
    'water-leakage':  50,   // Single pipe segment
    'water leakage':  50,
    'water':          50,
    'drainage':       75,   // Drain network node
    'roads':          100,  // Road section (~2 lane widths)
    'road':           100,
    'sanitation':     150,  // Collection zone
    'garbage':        150,
    'streetlights':   200,  // Lighting circuit segment
    'electricity':    100,
    'default':        100,  // Fallback for unconfigured categories
  } as Record<string, number>,

  // Minimum complaints to flag a cluster as recurring
  MIN_OCCURRENCES_TO_FLAG: 3,

  // Deduplication: complaints within this window (seconds) = same event
  DEDUP_WINDOW_SECONDS: 86400, // 24 hours

  // Severity thresholds (risk score 0–100)
  SEVERITY_THRESHOLDS: {
    CRITICAL: 80,
    HIGH:     60,
    MEDIUM:   40,
    LOW:      0,
  },

  // Days before predicted next occurrence to show urgent warning
  UPCOMING_WARNING_DAYS: 14,

  // Seasonal decomposition eligibility
  SEASONAL_MIN_MONTHS: 24,
  SEASONAL_MIN_EVENTS: 12,

  // Prediction tolerance: ±N days counts as a correct prediction
  PREDICTION_TOLERANCE_DAYS: 15,

  // Risk score weights
  RISK_WEIGHTS: {
    w_count: 0.4,
    w_freq:  0.4,
    w_trend: 0.2,
  },

  // Category criticality multipliers for Risk Score
  CATEGORY_WEIGHTS: {
    'water-leakage': 1.5,
    'water leakage': 1.5,
    'water':         1.5,
    'drainage':      1.3,
    'roads':         1.2,
    'road':          1.2,
    'sanitation':    1.1,
    'garbage':       1.1,
    'streetlights':  1.0,
    'electricity':   1.4,
    'default':       1.0,
  } as Record<string, number>,

  // Contractor is HIGH RISK if repeat failure rate exceeds this
  CONTRACTOR_HIGH_RISK_THRESHOLD: 0.70,

  // Post-repair window: complaints within this many days = contractor failure
  CONTRACTOR_REPEAT_WINDOW_DAYS: 60,
};
