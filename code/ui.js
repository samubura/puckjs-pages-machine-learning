// UI management: button state, event listeners, log clearing

function updateUIState() {
	// Update button states
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
	
	// Update all counters and status indicators
	updateConnectionStatus();
	updateRawDataCounter();
	updateLabeledDataCounter();
	updateFeatureCounter();
	updateTrainingDisplay();
	updateRecordingStatus();
	updateInferenceStatus();
}

// Update connection status indicator
function updateConnectionStatus() {
	const statusElem = document.getElementById('connectionStatus');
	if (!statusElem) return;
	
	if (uart) {
		statusElem.textContent = 'Connected';
		statusElem.className = 'status-badge active';
	} else {
		statusElem.textContent = 'Disconnected';
		statusElem.className = 'status-badge inactive';
	}
}

// Update raw data counter
function updateRawDataCounter() {
	const counterElem = document.getElementById('rawDataCount');
	if (!counterElem) return;
	
	const rawCount = getRawSampleCount();
	counterElem.textContent = `Raw samples: ${rawCount}`;
	if (rawCount > 0) {
		counterElem.className = 'data-counter active';
	} else {
		counterElem.className = 'data-counter';
	}
}

// Update labeled data counter and breakdown
function updateLabeledDataCounter() {
	const counterElem = document.getElementById('labeledDataCount');
	const breakdownElem = document.getElementById('labelBreakdown');
	if (!counterElem) return;
	
	const labeledCount = getLabeledSampleCount();
	counterElem.textContent = `Labeled samples: ${labeledCount}`;
	
	if (labeledCount > 0) {
		counterElem.className = 'data-counter active';
		
		// Update breakdown by label
		if (breakdownElem) {
			const labels = getAllLabels();
			let breakdownHTML = '';
			labels.forEach(label => {
				const count = getLabeledSampleCount(label);
				breakdownHTML += `<span class="label-count">${label}: ${count}</span> `;
			});
			breakdownElem.innerHTML = breakdownHTML;
		}
	} else {
		counterElem.className = 'data-counter';
		if (breakdownElem) breakdownElem.innerHTML = '';
	}
}

// Update feature vector counter
function updateFeatureCounter() {
	const counterElem = document.getElementById('featureCount');
	const statusElem = document.getElementById('featureStatus');
	if (!counterElem) return;
	
	const count = featureVectors.length;
	counterElem.textContent = `Feature vectors: ${count}`;
	
	if (statusElem) {
		if (count > 0) {
			statusElem.textContent = 'Processed';
			statusElem.className = 'status-badge active';
		} else {
			statusElem.textContent = 'Not processed';
			statusElem.className = 'status-badge inactive';
		}
	}
	
	if (count > 0) {
		counterElem.className = 'data-counter active';
	} else {
		counterElem.className = 'data-counter';
	}
}

// Update training display with accuracy
function updateTrainingDisplay() {
	const statusElem = document.getElementById('trainingStatus');
	const accuracyElem = document.getElementById('trainingAccuracy');
	const featureCountElem = document.getElementById('labeledFeatureCount');
	
	if (featureCountElem) {
		const count = labeledFeatureVectors.length;
		featureCountElem.textContent = count > 0 ? `Training samples: ${count}` : '';
		if (count > 0) {
			featureCountElem.className = 'data-counter active';
		} else {
			featureCountElem.className = 'data-counter';
		}
	}
	
	if (statusElem) {
		if (trainingStatus === 'training') {
			statusElem.textContent = 'Training...';
			statusElem.className = 'status-badge warning';
		} else if (trainingStatus === 'complete') {
			statusElem.textContent = 'Trained';
			statusElem.className = 'status-badge active';
		} else {
			statusElem.textContent = 'Not trained';
			statusElem.className = 'status-badge inactive';
		}
	}
	
	if (accuracyElem && trainingAccuracy !== null) {
		accuracyElem.textContent = `Accuracy: ${trainingAccuracy}%`;
		accuracyElem.className = 'data-counter active';
	} else if (accuracyElem) {
		accuracyElem.textContent = '';
	}
}

// Update recording status
function updateRecordingStatus() {
	const rawStatusElem = document.getElementById('rawRecordingStatus');
	const labeledStatusElem = document.getElementById('labeledRecordingStatus');
	
	if (rawStatusElem && recording && currentLabel === null) {
		rawStatusElem.textContent = 'Recording...';
		rawStatusElem.className = 'status-badge warning';
	} else if (rawStatusElem) {
		const rawCount = getRawSampleCount();
		if (rawCount > 0) {
			rawStatusElem.textContent = 'Data collected';
			rawStatusElem.className = 'status-badge active';
		} else {
			rawStatusElem.textContent = 'Idle';
			rawStatusElem.className = 'status-badge inactive';
		}
	}
	
	if (labeledStatusElem && recording && currentLabel !== null) {
		labeledStatusElem.textContent = `Recording: ${currentLabel}`;
		labeledStatusElem.className = 'status-badge warning';
	} else if (labeledStatusElem) {
		const labeledCount = getLabeledSampleCount();
		if (labeledCount > 0) {
			labeledStatusElem.textContent = 'Data collected';
			labeledStatusElem.className = 'status-badge active';
		} else {
			labeledStatusElem.textContent = 'Idle';
			labeledStatusElem.className = 'status-badge inactive';
		}
	}
}

// Update inference status
function updateInferenceStatus() {
	const statusElem = document.getElementById('inferenceStatus');
	if (!statusElem) return;
	
	if (inferencing) {
		statusElem.textContent = 'Running...';
		statusElem.className = 'status-badge warning';
	} else if (nn) {
		statusElem.textContent = 'Ready';
		statusElem.className = 'status-badge active';
	} else {
		statusElem.textContent = 'Stopped';
		statusElem.className = 'status-badge inactive';
	}
}

