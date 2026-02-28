// Training step logic

function trainModel(samples, features = ["ax", "ay", "az", "gx", "gy", "gz"]) {
	if (!samples || samples.length === 0) {
		log("No labeled samples to train on.");
		return;
	}
	// Prepare data
	const inputs = samples.map(s => features.map(f => s[f]));
	const labels = samples.map(s => s.label);
	// Use ml5.js NeuralNetwork
	nn = ml5.neuralNetwork({
		task: "classification",
		debug: true
	});
	for (let i = 0; i < inputs.length; ++i) {
		nn.addData(inputs[i], [labels[i]]);
	}
	nn.normalizeData();
	nn.train({ epochs: 32 }, () => {
		log("Training complete.");
		updateUIState();
	});
}

