// Training step logic

// Layer management
let layerIdCounter = 1;

function addLayer() {
	const container = document.getElementById('layersContainer');
	const layerCount = container.children.length;
	const layerId = layerIdCounter++;
	
	const layerItem = document.createElement('div');
	layerItem.className = 'layer-item';
	layerItem.setAttribute('data-layer-id', layerId);
	
	layerItem.innerHTML = `
		<span class="layer-label">Layer ${layerCount + 1}:</span>
		<select class="layer-type">
			<option value="dense" selected>Dense</option>
		</select>
		<input type="number" class="layer-units input-small" value="8" min="2" max="256" placeholder="Units">
		<span class="units-label">units</span>
		<button class="remove-layer-btn" onclick="removeLayer(${layerId})" title="Remove layer">✕</button>
	`;
	
	container.appendChild(layerItem);
	updateLayerLabels();
}

function removeLayer(layerId) {
	const container = document.getElementById('layersContainer');
	if (container.children.length <= 1) {
		log('Cannot remove the last layer');
		return;
	}
	
	const layerItem = container.querySelector(`[data-layer-id="${layerId}"]`);
	if (layerItem) {
		layerItem.remove();
		updateLayerLabels();
	}
}

function updateLayerLabels() {
	const container = document.getElementById('layersContainer');
	const layers = container.children;
	for (let i = 0; i < layers.length; i++) {
		const label = layers[i].querySelector('.layer-label');
		if (label) {
			label.textContent = `Layer ${i + 1}:`;
		}
	}
}

function getLayerConfig() {
	const container = document.getElementById('layersContainer');
	const layers = [];
	
	for (const layerItem of container.children) {
		const type = layerItem.querySelector('.layer-type').value;
		const unitsInput = layerItem.querySelector('.layer-units').value;
		const units = parseInt(unitsInput, 10);
		
		// Validate units
		if (isNaN(units) || units < 2 || units > 256) {
			log(`Warning: Invalid units value "${unitsInput}", using default of 8`);
			layers.push({ type, units: 8 });
		} else {
			layers.push({ type, units });
		}
	}
	
	console.log('Layer configuration:', layers);
	return layers;
}

// Make functions global
window.addLayer = addLayer;
window.removeLayer = removeLayer;

function trainModel() {
	if (!labeledFeatureVectors || labeledFeatureVectors.length === 0) {
		log("No labeled data to train on. Collect labeled data first.");
		return;
	}

	// Get feature keys (exclude 'label' and internal flags)
	const featureKeys = Object.keys(labeledFeatureVectors[0]).filter(k => k !== 'label' && !k.startsWith('_'));
	log(`Training with ${featureKeys.length} features: ${featureKeys.join(', ')}`);

	// Prepare inputs and labels
	const inputs = labeledFeatureVectors.map(vec => featureKeys.map(key => vec[key]));
	const labels = labeledFeatureVectors.map(vec => vec.label);

	// Get training parameters from UI
	const epochs = parseInt(document.getElementById('epochsInput').value) || 50;
	const batchSize = parseInt(document.getElementById('batchSizeInput').value) || 32;
	const learningRate = parseFloat(document.getElementById('learningRateInput').value) || 0.2;
	const validationSplit = parseInt(document.getElementById('validationSplitInput').value) || 20;
	
	// Get custom layer configuration
	let layers = getLayerConfig();
	
	// Validate layer configuration
	if (!layers || layers.length === 0) {
		log('Error: No layers configured, using default');
		layers = [{ type: 'dense', units: 16 }];
	}
	
	// Count unique labels to determine output layer size
	const uniqueLabels = [...new Set(labels)];
	const numClasses = uniqueLabels.length;
	log(`Detected ${numClasses} classes: ${uniqueLabels.join(', ')}`);
	
	// Add activation functions to hidden layers
	layers = layers.map(layer => ({
		...layer,
		activation: 'relu'  // ReLU activation for hidden layers
	}));
	
	// Always append output layer with softmax activation
	layers.push({ 
		type: 'dense', 
		units: numClasses,
		activation: 'softmax'  // Softmax for classification output
	});
	log(`Appended output layer with ${numClasses} units (softmax activation)`);

	// Split train and validation
	const splitRatio = 1 - (validationSplit / 100);
	const splitIndex = Math.floor(inputs.length * splitRatio);
	const trainInputs = inputs.slice(0, splitIndex);
	const trainLabels = labels.slice(0, splitIndex);
	const valInputs = inputs.slice(splitIndex);
	const valLabels = labels.slice(splitIndex);

	log(`Training set: ${trainInputs.length} samples`);
	log(`Validation set: ${valInputs.length} samples`);
	log(`Parameters: epochs=${epochs}, batchSize=${batchSize}, learningRate=${learningRate}`);
	log(`Architecture: ${layers.map((l, i) => `Layer ${i+1}: ${l.type} with ${l.units} units`).join(', ')}`);

	// Create ml5.js NeuralNetwork with custom architecture
	// Pass layers array directly to ml5.js
	console.log('Layer configuration:', JSON.stringify(layers));
	log(`Layers: ${JSON.stringify(layers)}`);
	
	nn = ml5.neuralNetwork({
		task: "classification",
		debug: true,
		layers: layers
	});

	// Add training data
	for (let i = 0; i < trainInputs.length; i++) {
		nn.addData(trainInputs[i], [trainLabels[i]]);
	}

	// Normalize data
	nn.normalizeData();
	log("Data normalized");

	// Train the model
	const trainingOptions = {
		epochs: epochs,
		batchSize: batchSize,
		learningRate: learningRate
	};

	log(`Starting training...`);
	
	// Set training status
	trainingStatus = 'training';
	trainingAccuracy = null;
	updateUIState();

	nn.train(trainingOptions, () => {
		log("Training complete!");
		
		// Set training complete status
		trainingStatus = 'complete';
		
		// Validate the model
		if (valInputs.length > 0) {
			validateModel(valInputs, valLabels);
		} else {
			updateUIState();
		}
	});
}

function validateModel(valInputs, valLabels) {
	log("Validating model...");
	let correct = 0;
	let total = valInputs.length;

	// Create a promise-based validation to handle async classify calls
	const validationPromises = valInputs.map((input, idx) => {
		return new Promise((resolve) => {
			nn.classify(input, (error, results) => {
				if (error) {
					log(`Validation error: ${error}`);
					resolve(false);
					return;
				}
				const predicted = results[0].label;
				const actual = valLabels[idx];
				resolve(predicted === actual);
			});
		});
	});

	Promise.all(validationPromises).then(results => {
		correct = results.filter(r => r).length;
		const accuracy = (correct / total * 100).toFixed(2);
		log(`Validation Accuracy: ${correct}/${total} (${accuracy}%)`);
		
		// Update global accuracy state
		trainingAccuracy = accuracy;
		updateUIState();
	});
}