// Similarity matching step logic

function computeSimilarity(sample, clusterCenters, features = ["ax", "ay", "az", "gx", "gy", "gz"]) {
	// Euclidean distance to each cluster center
	return clusterCenters.map(center => {
		let sum = 0;
		for (let i = 0; i < features.length; ++i) {
			const f = features[i];
			sum += Math.pow(sample[f] - center[i], 2);
		}
		return Math.sqrt(sum);
	});
}

function matchToCluster(sample, clusterCenters, features) {
	const dists = computeSimilarity(sample, clusterCenters, features);
	const minIdx = dists.indexOf(Math.min(...dists));
	return minIdx;
}
// Step 5: Cluster Labeling & Similarity
// Handles cluster labeling UI, similarity computation, and visualization
// ...existing code will be moved here in the next step...
