// Labeled data collection step logic


function startLabeledRecording() {
	if (!uart) {
		log("Connect to Puck.js first.");
		return;
	}
	if (!currentLabel) {
		const select = document.getElementById('gestureLabel');
		if (select && select.value) {
			setCurrentLabel(select.value);
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
	setCurrentLabel(newLabel);
	log(`Added new label: ${newLabel}`);
	updateUIState();
	input.value = '';
}

// Attach to window for global access
window.addNewGestureLabel = addNewGestureLabel;

// Run feature engineering for all labels
function runLabeledFeatureEngineering() {
	const select = document.getElementById('gestureLabel');
	if (!select || !select.options.length) {
		log("No labels available.");
		return;
	}
	
	if (!collectedSamples || !collectedSamples.length) {
		log('No collected samples.');
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
	
	if (!window.extractFeatureVectors) {
		log('Feature extraction function not found.');
		return;
	}
	
	let totalVectors = 0;
	
	// Process each unique label in collected samples
	const labels = [...new Set(collectedSamples.map(s => s.label).filter(l => l != null))];
	for (const label of labels) {
		const labeledSamples = collectedSamples.filter(s => s.label === label);
		const vectors = window.extractFeatureVectors(labeledSamples, selected, windowSize, () => label);
		labeledFeatureVectors.push(...vectors);
		totalVectors += vectors.length;
		log(`Labeled feature engineering: ${vectors.length} vectors created for label "${label}".`);
	}
	
	log(`Total labeled feature vectors: ${totalVectors}`);
	console.log('Labeled feature vectors:', labeledFeatureVectors);
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

