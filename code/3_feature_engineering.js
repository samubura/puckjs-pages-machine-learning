

// --- Feature Engineering Logic ---
function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function stddev(arr) {
  if (!arr.length) return 0;
  const mu = mean(arr);
  return Math.sqrt(mean(arr.map(a => (a - mu) ** 2)));
}
function minVal(arr) {
  if (!arr.length) return 0;
  return Math.min(...arr);
}
function maxVal(arr) {
  if (!arr.length) return 0;
  return Math.max(...arr);
}

function extractFeaturesWindow(window, selected) {
  // window: array of samples
  // selected: {mean:bool, stddev:bool, min:bool, max:bool}
  const accX = window.map(s => s.acc ? s.acc.x : s.ax);
  const accY = window.map(s => s.acc ? s.acc.y : s.ay);
  const accZ = window.map(s => s.acc ? s.acc.z : s.az);
  const gyroX = window.map(s => s.gyro ? s.gyro.x : s.gx);
  const gyroY = window.map(s => s.gyro ? s.gyro.y : s.gy);
  const gyroZ = window.map(s => s.gyro ? s.gyro.z : s.gz);
  let feats = {};
  if (selected.mean) {
    feats.meanAccX = mean(accX);
    feats.meanAccY = mean(accY);
    feats.meanAccZ = mean(accZ);
    feats.meanGyroX = mean(gyroX);
    feats.meanGyroY = mean(gyroY);
    feats.meanGyroZ = mean(gyroZ);
  }
  if (selected.stddev) {
    feats.stdAccX = stddev(accX);
    feats.stdAccY = stddev(accY);
    feats.stdAccZ = stddev(accZ);
    feats.stdGyroX = stddev(gyroX);
    feats.stdGyroY = stddev(gyroY);
    feats.stdGyroZ = stddev(gyroZ);
  }
  if (selected.min) {
    feats.minAccX = minVal(accX);
    feats.minAccY = minVal(accY);
    feats.minAccZ = minVal(accZ);
    feats.minGyroX = minVal(gyroX);
    feats.minGyroY = minVal(gyroY);
    feats.minGyroZ = minVal(gyroZ);
  }
  if (selected.max) {
    feats.maxAccX = maxVal(accX);
    feats.maxAccY = maxVal(accY);
    feats.maxAccZ = maxVal(accZ);
    feats.maxGyroX = maxVal(gyroX);
    feats.maxGyroY = maxVal(gyroY);
    feats.maxGyroZ = maxVal(gyroZ);
  }
  return feats;
}

// Modular: extract feature vectors from samples, with optional label assignment
// samples: array of raw samples
// selected: {mean, stddev, min, max}
// windowSize: int
// labelFn: function(window, i) => label (optional)
function extractFeatureVectors(samples, selected, windowSize, labelFn) {
  const vectors = [];
  for (let i = 0; i <= samples.length - windowSize; i += windowSize) {
    const window = samples.slice(i, i + windowSize);
    const feats = extractFeaturesWindow(window, selected);
    if (labelFn) feats.label = labelFn(window, i);
    vectors.push(feats);
  }
  return vectors;
}

function runFeatureEngineering() {
  if (!collectedSamples || !collectedSamples.length) {
    log("No raw data to process.");
    return;
  }
  const selected = {
    mean: document.getElementById('feat_mean').checked,
    stddev: document.getElementById('feat_stddev').checked,
    min: document.getElementById('feat_min').checked,
    max: document.getElementById('feat_max').checked
  };
  const windowSize = parseInt(document.getElementById('windowSize').value, 10) || 1;
  featureVectors = extractFeatureVectors(collectedSamples, selected, windowSize);
  document.getElementById('featureCount').textContent = `Feature vectors: ${featureVectors.length}`;
  log(`Feature engineering complete. ${featureVectors.length} vectors created.`);
  if (window.updateClusterFeatureDropdowns) window.updateClusterFeatureDropdowns();
  updateUIState && updateUIState();
}

// Expose for UI and other modules
window.runFeatureEngineering = runFeatureEngineering;
window.extractFeatureVectors = extractFeatureVectors;