

// Shared global state for the app
let nn;
let collectedSamples = [];
let featureVectors = [];

let labeledFeatureVectors = [];

//application state
let recording = false;
let inferencing = false;
let currentLabel = null;



function setCurrentLabel(label) {
	currentLabel = label;
	log(`Current label set to: ${label}`);
	updateUIState();
}