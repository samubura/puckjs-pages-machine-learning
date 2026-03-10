// Labeled data collection step logic


function startLabeledRecording() {
	if (!uart) {
		log("Connect to Puck.js first.");
		return;
	}
	if (!currentLabel) {
		const select = document.getElementById('gestureLabel');
		if (select && select.value) {
			currentLabel = select.value;
		} else {
			log("Please select a label.");
			return;
		}
	}
	log(`Started labeled data collection for label: ${currentLabel}`);
	updateUIState();
	startCollecting();
}

function stopLabeledRecording() {
	if (!recording) return;
	stopCollecting();
	let samplesForLabel = collectedSamples.filter(s => s.label === currentLabel).length;
	log(`Stopped labeled data collection. Collected ${samplesForLabel} samples for label: ${currentLabel}`);
	updateUIState();
}

// Add new gesture label to the select and update currentLabel
function addNewGestureLabel() {
	const input = document.getElementById('newLabelInput');
	const select = document.getElementById('gestureLabel');
	if (!input || !select) return;
	const newLabel = input.value.trim();
	if (!newLabel) {
		log('Please enter a label name.');
		return;
	}
	// Check if label already exists
	for (let i = 0; i < select.options.length; i++) {
		if (select.options[i].value === newLabel) {
			log('Label already exists.');
			return;
		}
	}
	// Add new option
	const option = document.createElement('option');
	option.value = newLabel;
	option.textContent = newLabel;
	select.appendChild(option);
	select.value = newLabel;
	currentLabel = newLabel;
	log(`Added new label: ${newLabel}`);
	updateUIState();
	input.value = '';
}

// Attach to window for global access
window.addNewGestureLabel = addNewGestureLabel;

// Run feature engineering for the current label
function runLabeledFeatureEngineering() {
	if (!currentLabel) {
		log('No label selected.');
		return;
	}
	if (!collectedSamples || !collectedSamples.length) {
		log('No collected samples.');
		return;
	}
	// Filter samples for current label
	const labeledSamples = collectedSamples.filter(s => s.label === currentLabel);
	if (!labeledSamples.length) {
		log(`No samples found for label: ${currentLabel}`);
		return;
	}
	// Get feature selection and window size from UI
	const selected = {
		mean: document.getElementById('feat_mean').checked,
		stddev: document.getElementById('feat_stddev').checked,
		min: document.getElementById('feat_min').checked,
		max: document.getElementById('feat_max').checked
	};
	const windowSize = parseInt(document.getElementById('windowSize').value, 10) || 1;
	// Use extractFeatureVectors from feature engineering module
	if (!window.extractFeatureVectors) {
		log('Feature extraction function not found.');
		return;
	}
	// Attach label to each feature vector
	const vectors = window.extractFeatureVectors(labeledSamples, selected, windowSize, () => currentLabel);
	// Store or expose labeled feature vectors
	labeledFeatureVectors.push(...vectors);
	console.log('Labeled feature vectors:', labeledFeatureVectors);
	log(`Labeled feature engineering complete. ${vectors.length} new vectors created for label: ${currentLabel}`);
	updateUIState && updateUIState();
}

window.addEventListener("DOMContentLoaded", function() {
	const gestureSelect = document.getElementById("gestureLabel");
	if (gestureSelect) {
		gestureSelect.addEventListener("change", function() {
			setCurrentLabel(gestureSelect.value);
		});
		updateUIState();
	}
});


window.runLabeledFeatureEngineering = runLabeledFeatureEngineering;

