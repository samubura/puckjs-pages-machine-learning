

// Shared global state for the app
let nn;
let collectedSamples = [];
let featureVectors = [];

//data acquisition frequency
let frequency = 100; 

let labeledFeatureVectors = [];

//application state
let recording = false;
let inferencing = false;
let currentLabel = null;

// Status tracking for UI
let connectionStatus = 'disconnected'; // 'disconnected', 'connected'
let trainingStatus = 'idle'; // 'idle', 'training', 'complete'
let trainingAccuracy = null;
let processingStatus = {}; // Track completion status of each step

function setCurrentLabel(label) {
	currentLabel = label;
	log(`Current label set to: ${label}`);
	updateUIState();
}

// Helper functions to get sample counts
function getRawSampleCount() {
	return collectedSamples.filter(s => s.label == null).length;
}

function getLabeledSampleCount(label = null) {
	if (label) {
		return collectedSamples.filter(s => s.label === label).length;
	}
	return collectedSamples.filter(s => s.label != null).length;
}

function getAllLabels() {
	const labels = new Set();
	collectedSamples.forEach(s => {
		if (s.label) labels.add(s.label);
	});
	return Array.from(labels);
}