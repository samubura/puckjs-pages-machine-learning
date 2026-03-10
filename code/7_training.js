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