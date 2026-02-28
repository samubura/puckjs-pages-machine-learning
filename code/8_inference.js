// Inference step logic

function inferClass(sample, features = ["ax", "ay", "az", "gx", "gy", "gz"]) {
	if (!nn) {
		log("Model not trained.");
		return;
	}
	const input = features.map(f => sample[f]);
	nn.classify(input, (err, results) => {
		if (err) {
			log("Inference error: " + err);
			return;
		}
		if (results && results[0]) {
			log(`Predicted: ${results[0].label} (confidence: ${results[0].confidence.toFixed(2)})`);
		}
	});
}
// Step 7: Inference
// Handles running the model and live classification
// ...existing code will be moved here in the next step...
