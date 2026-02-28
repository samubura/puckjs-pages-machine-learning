// Labeled data collection step logic

function setCurrentLabel(label) {
	currentLabel = label;
	log(`Current label set to: ${label}`);
	updateUIState();
}

function startLabeledCollection(label) {
	if (!uart) {
		log("Connect to Puck.js first.");
		return;
	}
	if (!label) {
		log("Please select a label.");
		return;
	}
	recording = true;
	currentLabel = label;
	log(`Started labeled data collection for label: ${label}`);
	updateUIState();
	sendCommand("START\n");
}

function stopLabeledCollection() {
	if (!recording) return;
	recording = false;
	sendCommand("STOP\n");
	log(`Stopped labeled data collection. Collected ${collectedSamples.length} samples for label: ${currentLabel}`);
	updateUIState();
}
// Step 4: Labeled Data Collection
// Handles labeledSamples, start/stop labeled recording, and related logic
// ...existing code will be moved here in the next step...
