// Raw data collection step logic

function startRawRecording() {
	if (!uart) {
		log("Connect to Puck.js first.");
		return;
	}
	recording = true;
	collectedSamples = [];
	log("Started raw data collection.");
	updateUIState();
	sendCommand("START\n");
}

function stopRawRecording() {
	if (!recording) return;
	recording = false;
	sendCommand("STOP\n");
	log(`Stopped raw data collection. Collected ${collectedSamples.length} samples.`);
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

// Expose functions globally for UI
window.startRawRecording = startRawRecording;
window.stopRawRecording = stopRawRecording;
window.downloadCollectedData = downloadCollectedData;
window.loadCollectedData = loadCollectedData;
