// All logic has been modularized into the code/ directory.

// --- Populate clustering feature dropdowns on load ---
window.addEventListener("load", () => {
  const features = [
    'meanAccX','meanAccY','meanAccZ','stdAccX','stdAccY','stdAccZ',
    'meanGyroX','meanGyroY','meanGyroZ','stdGyroX','stdGyroY','stdGyroZ'
  ];
  const xSel = document.getElementById('clusterFeatureX');
  const ySel = document.getElementById('clusterFeatureY');
  if (xSel && ySel) {
    features.forEach(f => {
      let optX = document.createElement('option');
      optX.value = f; optX.textContent = f;
      xSel.appendChild(optX);
      let optY = document.createElement('option');
      optY.value = f; optY.textContent = f;
      ySel.appendChild(optY);
    });
    xSel.value = 'meanAccX';
    ySel.value = 'meanAccY';
  }
});
// --- Unsupervised Learning: K-means Clustering and Visualization ---
let clusterChart = null;

function runClusteringAndVisualize() {
  if (!labeledSamples.length) {
    log("No labeled samples to cluster. Please collect labeled data first.");
    return;
  }
  // Extract features for each labeled sample (single-sample window)
  const featuresArr = labeledSamples.map(s => extractFeatures([s]));
  // Get selected features from UI
  const xFeature = document.getElementById('clusterFeatureX').value;
  const yFeature = document.getElementById('clusterFeatureY').value;
  const dataPoints = featuresArr.map(f => [f[xFeature], f[yFeature]]);
  const k = parseInt(document.getElementById('numClusters').value, 10) || 4;
  const kmeans = ml5.kmeans(dataPoints, k, () => {
    log("K-means clustering complete.");
    const clusters = kmeans.clusters;
    lastClusterAssignments = clusters;
    lastClusterCentroids = kmeans.centroids;
    visualizeClusters2D(dataPoints, clusters, xFeature, yFeature);
  });
}

function visualizeClusters2D(dataPoints, clusters, xFeature, yFeature) {
  const ctx = document.getElementById('clusterChart').getContext('2d');
  // Prepare data grouped by cluster
  const k = Math.max(...clusters) + 1;
  const colors = [
    'rgba(255, 99, 132, 0.7)',
    'rgba(54, 162, 235, 0.7)',
    'rgba(255, 206, 86, 0.7)',
    'rgba(75, 192, 192, 0.7)',
    'rgba(153, 102, 255, 0.7)',
    'rgba(255, 159, 64, 0.7)'
  ];
  const datasets = [];
  for (let i = 0; i < k; i++) {
    const clusterPoints = dataPoints
      .map((pt, idx) => ({ pt, idx }))
      .filter(obj => clusters[obj.idx] === i)
      .map(obj => ({ x: obj.pt[0], y: obj.pt[1] }));
    datasets.push({
      label: `Cluster ${i + 1}`,
      data: clusterPoints,
      backgroundColor: colors[i % colors.length],
      pointRadius: 5
    });
  }
  if (clusterChart) clusterChart.destroy();
  clusterChart = new Chart(ctx, {
    type: 'scatter',
    data: { datasets },
    options: {
      plugins: { legend: { display: true } },
      scales: {
        x: { title: { display: true, text: xFeature || 'X' } },
        y: { title: { display: true, text: yFeature || 'Y' } }
      }
    }
  });
}
let UART = Puck;


function mean(arr) {
  const sum = arr.reduce((a, b) => a + b, 0);
  return sum / arr.length;
}

function stddev(arr) {
  const mu = mean(arr);
  const diffArr = arr.map(a => (a - mu) ** 2);
  return Math.sqrt(mean(diffArr));
}

let uart;
let recording = false;
let currentLabel = "";
let collectedSamples = [];
let featureVectors = [];
let nn;
let inferencing = false;
const inferenceWindowSize = 10;
let inferenceBuffer = [];

function log(msg) {
  const logElem = document.getElementById("log");
  logElem.textContent += msg + "\n";
  logElem.scrollTop = logElem.scrollHeight;
}

function updateUIState() {
  if (document.getElementById("startBtn"))
    document.getElementById("startBtn").disabled = !uart;
  if (document.getElementById("stopBtn"))
    document.getElementById("stopBtn").disabled = !recording;
  if (document.getElementById("preprocessBtn"))
    document.getElementById("preprocessBtn").disabled = collectedSamples.length === 0;
  if (document.getElementById("trainBtn"))
    document.getElementById("trainBtn").disabled = featureVectors.length === 0;
  if (document.getElementById("startInferenceBtn"))
    document.getElementById("startInferenceBtn").disabled = !nn || !uart || inferencing;
  if (document.getElementById("stopInferenceBtn"))
    document.getElementById("stopInferenceBtn").disabled = !inferencing;
}

window.addEventListener("load", updateUIState);

function connectToPuck() {
  UART.connect(function (connection) {
    if (!connection) {
      log("Error when connecting! Try again.");
      return;
    }
    uart = connection;
    log("Connected to Puck.js");
    updateUIState();

    uart.on("data", function (data) {
      handleIncomingData(data);
    });

    uart.on("close", function () {
      log("Disconnected from Puck.js");
      uart = null;
      updateUIState();
    });
  });
}

function handleIncomingData(data) {
  if (!handleIncomingData.buffer) handleIncomingData.buffer = "";
  handleIncomingData.buffer += data;
  let index = handleIncomingData.buffer.indexOf("\n");
  while (index >= 0) {
    const line = handleIncomingData.buffer.substring(0, index);
    handleIncomingData.buffer = handleIncomingData.buffer.substring(index + 1);
    try {
      const sample = JSON.parse(line);
      processSample(sample);
    } catch (e) {
      // skip malformed data
    }
    index = handleIncomingData.buffer.indexOf("\n");
  }
}

function processSample(sample) {
  if (recording) {
    sample.label = currentLabel;
    sample.timestamp = Date.now();
    collectedSamples.push(sample);
    updateUIState();
  } else if (inferencing && nn) {
    inferClass(sample);
  }
}

function sendCommand(cmd) {
  if (uart) uart.write(cmd);
}

function startRecording() {
  currentLabel = document.getElementById("gestureLabel").value;
  recording = true;
  sendCommand("Puck.accelOn();setInterval(()=>{var a=Puck.accel();Bluetooth.println(JSON.stringify(a));},100);\n");
  log("Started recording for label: " + currentLabel);
  updateUIState();
}

function stopRecording() {
  recording = false;
  sendCommand("reset();\n");
  log("Stopped recording. Collected " + collectedSamples.length + " samples.");
  updateUIState();
}

function downloadCollectedData() {
  const blob = new Blob([JSON.stringify(collectedSamples, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'collected_data.json';
  a.click();
  URL.revokeObjectURL(url);
}

function loadCollectedData(file) {
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        collectedSamples = collectedSamples.concat(JSON.parse(e.target.result));
        log("Data loaded. " + collectedSamples.length + " samples.");
        updateUIState();
      } catch (err) {
        log("Error loading data: " + err);
      }
    };
    reader.readAsText(file);
  }
}

// Preprocess all labeled data: manual and cluster-labeled
function preprocessData() {
  featureVectors = [];
  const windowSize = 10;

  // 1. Add manually labeled samples (windowed)
  for (let i = 0; i <= labeledSamples.length - windowSize; i += windowSize) {
    const window = labeledSamples.slice(i, i + windowSize);
    const features = extractFeatures(window);
    features.label = window[0].label;
    featureVectors.push(features);
  }

  // 2. Add cluster-labeled samples (single sample, use clusterLabels)
  if (lastClusterAssignments.length && clusterLabels.length) {
    for (let i = 0; i < lastClusterAssignments.length; i++) {
      const sample = labeledSamples[i];
      const features = extractFeatures([sample]);
      features.label = clusterLabels[lastClusterAssignments[i]] || `cluster_${lastClusterAssignments[i]+1}`;
      featureVectors.push(features);
    }
  }

  log(`Preprocessing complete. ${featureVectors.length} feature vectors created.`);
  updateUIState();
}

function extractFeatures(samples) {
  return {
    meanAccX: mean(samples.map(s => s.acc.x)),
    meanAccY: mean(samples.map(s => s.acc.y)),
    meanAccZ: mean(samples.map(s => s.acc.z)),
    stdAccX: stddev(samples.map(s => s.acc.x)),
    stdAccY: stddev(samples.map(s => s.acc.y)),
    stdAccZ: stddev(samples.map(s => s.acc.z)),

    meanGyroX: mean(samples.map(s => s.gyro.x)),
    meanGyroY: mean(samples.map(s => s.gyro.y)),
    meanGyroZ: mean(samples.map(s => s.gyro.z)),
    stdGyroX: stddev(samples.map(s => s.gyro.x)),
    stdGyroY: stddev(samples.map(s => s.gyro.y)),
    stdGyroZ: stddev(samples.map(s => s.gyro.z)),
  };
}

function trainModel() {
  ml5.setBackend('webgl');
  nn = ml5.neuralNetwork({
    inputs: 12,
    outputs: 4,
    task: 'classification',
    debug: true
  });

  featureVectors.forEach(({ label, ...input }) => {
    nn.addData(input, { label });
  });

  nn.normalizeData();
  const epochs = parseInt(document.getElementById("epochsInput").value, 10) || 50;

  nn.train({ epochs }, () => {
    log(`Training complete after ${epochs} epochs.`);
    updateUIState();
  });
}

function startInference() {
  inferencing = true;
  sendCommand("Puck.accelOn();setInterval(()=>{var a=Puck.accel();Bluetooth.println(JSON.stringify(a));},100);\n");
  log("Started inference stream from Puck.js");
  updateUIState();
}

function stopInference() {
  inferencing = false;
  sendCommand("reset();\n");
  inferenceBuffer = [];
  document.getElementById("liveClass").textContent = "Live Classification: -";
  log("Stopped inference.");
  updateUIState();
}

function inferClass(sample) {
  inferenceBuffer.push(sample);
  if (inferenceBuffer.length > inferenceWindowSize) {
    inferenceBuffer.shift();
  }

  if (!nn || inferenceBuffer.length < inferenceWindowSize) return;

  const features = extractFeatures(inferenceBuffer);

  nn.classify(features, results => {
    if (!results || !results[0]) {
      log("Inference error: No results returned.");
      return;
    }
    const classification = results[0].label;
    const confidence = (results[0].confidence * 100).toFixed(2);
    document.getElementById("liveClass").textContent = `Live Classification: ${classification} (${confidence}%)`;
  });
}

function saveModel() {
  if (nn) {
    nn.save();
    log("Model saved. Download initiated.");
    updateWorkflowUIState();
  } else {
    log("No trained model available to save.");
  }
}

function loadModel(files) {
  nn = ml5.neuralNetwork({
    inputs: 12,
    outputs: 4,
    task: 'classification',
    debug: true
  });

  nn.load(files, () => {
    log("Model loaded successfully and ready for inference.");
    updateUIState();
    updateWorkflowUIState();
  });
}

function handleModelFiles(fileList) {
  const files = Array.from(fileList);
  const fileMap = {};
  files.forEach(f => fileMap[f.name] = f);

  if (fileMap['model.json']) {
    loadModel(fileMap);
  } else {
    log("Please upload the correct model files (model.json, .bin, and metadata).");
  }
}
