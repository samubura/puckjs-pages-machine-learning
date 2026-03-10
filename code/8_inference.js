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
		if (results && results[0]) {
			const predicted = results[0].label;
			const confidence = (results[0].confidence * 100).toFixed(1);
			
			// Update the UI
			const liveClassElement = document.getElementById('liveClass');
			if (liveClassElement) {
				liveClassElement.textContent = `Live Classification: ${predicted} (${confidence}% confidence)`;
				liveClassElement.style.fontWeight = 'bold';
				liveClassElement.style.color = confidence > 70 ? 'green' : 'orange';
			}
		}
	});
}

