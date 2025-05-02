let uart;
let recording = false;
let collectedSamples = [];
let currentLabel = "";
let featureVectors = [];
let nn;

function log(msg) {
  document.getElementById("log").textContent += msg + "\n";
}

function connectToPuck() {
  uart = new UART();
  
  uart.on('connect', function() {
    log("Connected to Puck.js");
    uart.on('data', function(d) {
      try {
        const lines = d.trim().split("\n");
        lines.forEach(line => {
          const sample = JSON.parse(line);
          if (recording) {
            sample.label = currentLabel;
            sample.timestamp = Date.now();
            collectedSamples.push(sample);
          }
        });
      } catch (e) {
        // skip malformed data
      }
    });
  });

  uart.connect(function(err) {
    if (err) {
      log("Couldn't connect to Puck.js");
    }
  });
}

function sendCommand(cmd) {
  if (uart) {
    uart.write(cmd);
  }
}

function startRecording() {
  currentLabel = document.getElementById("gestureLabel").value;
  collectedSamples = [];
  recording = true;
  sendCommand("Puck.accelOn();setInterval(()=>{var a=Puck.accel();Bluetooth.println(JSON.stringify(a));},100);\n");
  log("Recording started for: " + currentLabel);
}

function stopRecording() {
  recording = false;
  sendCommand("reset();\n");
  log("Recording stopped. " + collectedSamples.length + " samples collected.");
}

function downloadCollectedData() {
  const blob = new Blob([JSON.stringify(collectedSamples, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gesture_data.json";
  a.click();
}

function preprocessData() {
  featureVectors = [];
  const windowSize = 10;
  for (let i = 0; i < collectedSamples.length - windowSize; i += windowSize) {
    const window = collectedSamples.slice(i, i + windowSize);
    const features = {
      meanX: mean(window.map(s => s.x)),
      meanY: mean(window.map(s => s.y)),
      meanZ: mean(window.map(s => s.z)),
      stdX: stddev(window.map(s => s.x)),
      stdY: stddev(window.map(s => s.y)),
      stdZ: stddev(window.map(s => s.z)),
      label: window[0].label
    };
    featureVectors.push(features);
  }
  log("Preprocessing complete. " + featureVectors.length + " vectors.");
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / arr.length);
}

function trainModel() {
  nn = ml5.neuralNetwork({ task: 'classification', debug: true });
  featureVectors.forEach(({ label, ...input }) => {
    nn.addData(input, { label });
  });
  nn.normalizeData();
  nn.train({ epochs: 20 }, () => log("Training complete."));
}
