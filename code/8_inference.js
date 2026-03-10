// Inference step logic

// Buffer to store incoming samples for windowing
let inferenceBuffer = [];

// Store feature settings from training
let inferenceWindowSize = 10;
let inferenceFeatureSettings = {
	mean: true,
	stddev: true,
	min: false,
	max: false
};

function inferClass(sample) {
	if (!nn) {
		log("Model not trained or loaded.");
		return;
	}

	// Collect samples in a buffer
	inferenceBuffer.push(sample);

	// Get window size and feature settings from the UI (same as used in training)
	inferenceWindowSize = parseInt(document.getElementById('windowSize').value, 10) || 10;
	inferenceFeatureSettings = {
		mean: document.getElementById('feat_mean').checked,
		stddev: document.getElementById('feat_stddev').checked,
		min: document.getElementById('feat_min').checked,
		max: document.getElementById('feat_max').checked
	};

	// Wait until we have enough samples for a window
	if (inferenceBuffer.length < inferenceWindowSize) {
		return;
	}

	// Keep only the most recent window
	if (inferenceBuffer.length > inferenceWindowSize) {
		inferenceBuffer = inferenceBuffer.slice(-inferenceWindowSize);
	}

	// Extract features from the window (reusing the feature extraction function)
	const featureVector = extractFeaturesWindow(inferenceBuffer, inferenceFeatureSettings);

	// Get feature keys in the same order as training (exclude 'label')
	const featureKeys = Object.keys(featureVector).filter(k => k !== 'label');
	const input = featureKeys.map(key => featureVector[key]);

	// Classify the input
	nn.classify(input, (err, results) => {
		if (err) {
			log("Inference error: " + err);
			return;
		}
		if (results && results.length > 0) {
			updateLabelBadges(results);
		}
	});
}

// Store labels in fixed order to prevent reordering
let fixedLabelOrder = [];

// Update the UI to display all labels with the recognized one highlighted
function updateLabelBadges(results) {
	const labelBadgesContainer = document.getElementById('labelBadges');
	if (!labelBadgesContainer) return;

	// Build a map of label -> result for quick lookup
	const resultMap = {};
	results.forEach(r => {
		resultMap[r.label] = r;
	});

	// Initialize or update fixed label order (sorted alphabetically for consistency)
	const currentLabels = results.map(r => r.label).sort();
	if (fixedLabelOrder.length === 0 || 
	    JSON.stringify(fixedLabelOrder.sort()) !== JSON.stringify(currentLabels)) {
		fixedLabelOrder = currentLabels;
	}

	// Find the top prediction
	const topPrediction = results[0];
	const topLabel = topPrediction.label;

	// Create badge elements for each label in fixed order
	labelBadgesContainer.innerHTML = '';
	
	fixedLabelOrder.forEach((label) => {
		const badge = document.createElement('span');
		badge.className = 'label-badge';
		
		const result = resultMap[label];
		const confidence = (result.confidence * 100).toFixed(1);
		
		if (label === topLabel) {
			// Highlight the top prediction
			if (confidence > 70) {
				badge.classList.add('active-high');
			} else {
				badge.classList.add('active-medium');
			}
			badge.innerHTML = `${label} <span class="confidence">${confidence}%</span>`;
		} else {
			// Show other labels as inactive
			badge.classList.add('inactive');
			badge.innerHTML = `${label} <span class="confidence">${confidence}%</span>`;
		}
		
		labelBadgesContainer.appendChild(badge);
	});
}

