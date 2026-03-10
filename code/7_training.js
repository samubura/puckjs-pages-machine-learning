// Training step logic

function trainModel() {
	if (!labeledFeatureVectors || labeledFeatureVectors.length === 0) {
		log("No labeled data to train on. Collect labeled data first.");
		return;
	}

	// Get feature keys (exclude 'label')
	const featureKeys = Object.keys(labeledFeatureVectors[0]).filter(k => k !== 'label');
	log(`Training with ${featureKeys.length} features: ${featureKeys.join(', ')}`);

	// Prepare inputs and labels
	const inputs = labeledFeatureVectors.map(vec => featureKeys.map(key => vec[key]));
	const labels = labeledFeatureVectors.map(vec => vec.label);

	// Split train and validation (80/20 split)
	const splitIndex = Math.floor(inputs.length * 0.8);
	const trainInputs = inputs.slice(0, splitIndex);
	const trainLabels = labels.slice(0, splitIndex);
	const valInputs = inputs.slice(splitIndex);
	const valLabels = labels.slice(splitIndex);

	log(`Training set: ${trainInputs.length} samples`);
	log(`Validation set: ${valInputs.length} samples`);

	// Create ml5.js NeuralNetwork
	nn = ml5.neuralNetwork({
		task: "classification",
		debug: true
	});

	// Add training data
	for (let i = 0; i < trainInputs.length; i++) {
		nn.addData(trainInputs[i], [trainLabels[i]]);
	}

	// Normalize data
	nn.normalizeData();
	log("Data normalized");

	// Get epochs from UI
	const epochs = parseInt(document.getElementById('epochsInput').value) || 50;

	// Train the model
	const trainingOptions = {
		epochs: epochs,
		batchSize: 32
	};

	log(`Starting training with ${epochs} epochs...`);
	updateUIState();

	nn.train(trainingOptions, () => {
		log("Training complete!");
		
		// Validate the model
		if (valInputs.length > 0) {
			validateModel(valInputs, valLabels);
		}
		
		updateUIState();
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
	});
}

function saveModel() {
	if (!nn) {
		log("No model to save. Train a model first.");
		return;
	}

	log("Saving model...");
	nn.save('gesture-model');
	log("Model saved! Download the files to load later.");
}

function handleModelFiles(files) {
	if (!files || files.length === 0) {
		log("No files selected.");
		return;
	}

	// Look for model.json and model.weights.bin
	let modelJson = null;
	let modelWeights = null;

	for (const file of files) {
		if (file.name.includes('.json')) {
			modelJson = file;
		} else if (file.name.includes('.bin')) {
			modelWeights = file;
		}
	}

	if (!modelJson) {
		log("Error: Could not find model.json file.");
		return;
	}

	if (!modelWeights) {
		log("Error: Could not find model weights (.bin) file.");
		return;
	}

	log("Loading model from files...");

	// Create ml5 neural network and load the model
	const modelOptions = {
		task: 'classification'
	};

	nn = ml5.neuralNetwork(modelOptions);

	// Read the model.json to create file path references
	const reader = new FileReader();
	reader.onload = function(e) {
		try {
			const modelData = JSON.parse(e.target.result);
			
			// Create blob URLs for the files
			const jsonBlob = new Blob([JSON.stringify(modelData)], { type: 'application/json' });
			const jsonUrl = URL.createObjectURL(jsonBlob);
			const weightsUrl = URL.createObjectURL(modelWeights);

			// Update the model data to point to the weights blob
			if (modelData.weightsManifest && modelData.weightsManifest[0]) {
				modelData.weightsManifest[0].paths = [weightsUrl];
			}

			// Create a new blob with updated paths
			const updatedJsonBlob = new Blob([JSON.stringify(modelData)], { type: 'application/json' });
			const updatedJsonUrl = URL.createObjectURL(updatedJsonBlob);

			// Load the model
			nn.load(updatedJsonUrl, () => {
				log("Model loaded successfully!");
				updateUIState();
				// Clean up blob URLs
				URL.revokeObjectURL(jsonUrl);
				URL.revokeObjectURL(weightsUrl);
				URL.revokeObjectURL(updatedJsonUrl);
			});
		} catch (error) {
			log(`Error loading model: ${error.message}`);
		}
	};
	reader.readAsText(modelJson);
}