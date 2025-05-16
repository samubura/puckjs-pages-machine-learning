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
  document.getElementById("log").textContent += msg + "\n";
}

function updateUIState() {
  document.getElementById("startBtn").disabled = !uart;
  document.getElementById("stopBtn").disabled = !recording;
  document.getElementById("preprocessBtn").disabled = collectedSamples.length === 0;
  document.getElementById("trainBtn").disabled = featureVectors.length === 0;
  document.getElementById("startInferenceBtn").disabled = !nn || !uart ||inferencing;
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

function preprocessData() {
  featureVectors = [];
  const windowSize = 10;

  for (let i = 0; i <= collectedSamples.length - windowSize; i += windowSize) {
    const window = collectedSamples.slice(i, i + windowSize);

    const features = extractFeatures(window);
    features.label = window[0].label;
    featureVectors.push(features);
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
