// Visualize clusters and labeled data together
function visualizeClusterLabeling() {
	const xFeature = document.getElementById('labeledClusterX').value;
	const yFeature = document.getElementById('labeledClusterY').value;
	const clusterLabels = window.lastClusterAssignments || [];
	const clusterData = featureVectors.map(f => [f[xFeature], f[yFeature]]);
	const labeledData = labeledFeatureVectors.map(f => [f[xFeature], f[yFeature]]);
	const labeledLabels = labeledFeatureVectors.map(f => f.label);

	// Prepare one dataset per cluster
	const clusterColors = [
		'rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 0.5)', 'rgba(255, 206, 86, 0.5)',
		'rgba(75, 192, 192, 0.5)', 'rgba(153, 102, 255, 0.5)', 'rgba(255, 159, 64, 0.5)',
		'rgba(199, 199, 199, 0.5)', 'rgba(83, 102, 255, 0.5)', 'rgba(255, 99, 178, 0.5)',
		'rgba(99, 255, 132, 0.5)', 'rgba(255, 178, 99, 0.5)', 'rgba(132, 99, 255, 0.5)'
	];
	const numClusters = Math.max(...clusterLabels) + 1;
	const clusterDatasets = [];
	for (let i = 0; i < numClusters; i++) {
		const points = clusterData
			.map((pt, idx) => ({ pt, idx }))
			.filter(obj => clusterLabels[obj.idx] === i)
			.map(obj => ({ x: obj.pt[0], y: obj.pt[1] }));
		clusterDatasets.push({
			label: `Cluster ${i + 1}`,
			data: points,
			backgroundColor: clusterColors[i % clusterColors.length],
			pointRadius: 5,
			showLine: false,
		});
	}

	// Group labeled data by label
	const labelSet = Array.from(new Set(labeledLabels));
	// Assign unique colors to each label
	const labelColors = [
		'#e6194b', // red
		'#3cb44b', // green
		'#ffe119', // yellow
		'#4363d8', // blue
		'#f58231', // orange
		'#911eb4', // purple
		'#46f0f0', // cyan
		'#f032e6', // magenta
		'#bcf60c', // lime
		'#fabebe', // pink
		'#008080', // teal
		'#e6beff', // lavender
		'#9a6324', // brown
		'#fffac8', // beige
		'#800000', // maroon
		'#aaffc3', // mint
		'#808000', // olive
		'#ffd8b1', // apricot
		'#000075', // navy
		'#808080', // grey
		'#ffffff', // white
		'#000000'  // black
	];
	const labeledDatasets = labelSet.map((label, idx) => {
		const points = labeledFeatureVectors
			.filter(f => f.label === label)
			.map(f => ({ x: f[xFeature], y: f[yFeature] }));
		return {
			label: `Labeled: ${label}`,
			data: points,
			backgroundColor: labelColors[idx % labelColors.length],
			pointRadius: 5,
            pointStyle: 'triangle',
			showLine: false,
		};
	});


	const datasets = [...labeledDatasets,...clusterDatasets, ];

	const chartCanvas = document.getElementById('labeledClusterChart');
	const ctx = chartCanvas.getContext('2d');
	if (window.labeledClusterChart && typeof window.labeledClusterChart.destroy === 'function') {
		window.labeledClusterChart.destroy();
	}
	window.labeledClusterChart = new Chart(ctx, {
		type: 'scatter',
		data: { datasets },
		options: {
			plugins: { legend: { display: true } },
			aspectRatio: 1,
			maintainAspectRatio: true,
			scales: {
				x: { title: { display: true, text: xFeature || 'X' } },
				y: { title: { display: true, text: yFeature || 'Y' } }
			}
		}
	});
}

// Assign labels to clusters based on centroid similarity

function assignLabelsToClusters() {
    const clusterLabels = window.lastClusterAssignments || [];
	const clusterData = featureVectors;
	const newLabeledData = labeledFeatureVectors;

    if (clusterData.length === 0 || clusterLabels.length === 0) {
        log('No cluster data to assign labels to');
        return;
    }

    if (newLabeledData.length === 0) {
        log('No labeled data to match against');
        return;
    }

    // Get feature keys (exclude 'label' property)
    const featureKeys = Object.keys(clusterData[0]).filter(k => k !== 'label');

    // Calculate centroids of clusters
    const numClusters = Math.max(...clusterLabels) + 1;
    const clusterCentroids = [];
    
    for (let c = 0; c < numClusters; c++) {
        const clusterPoints = clusterData.filter((_, idx) => clusterLabels[idx] === c);
        if (clusterPoints.length === 0) continue;
        
        const centroid = {};
        for (const key of featureKeys) {
            centroid[key] = clusterPoints.reduce((sum, pt) => sum + pt[key], 0) / clusterPoints.length;
        }
        clusterCentroids.push({ clusterId: c, centroid });
    }

    // Calculate centroids of labeled data grouped by label
    const labelSet = Array.from(new Set(newLabeledData.map(f => f.label)));
    const labeledCentroids = [];
    
    for (const label of labelSet) {
        const labeledPoints = newLabeledData.filter(f => f.label === label);
        const centroid = {};
        for (const key of featureKeys) {
            centroid[key] = labeledPoints.reduce((sum, pt) => sum + pt[key], 0) / labeledPoints.length;
        }
        labeledCentroids.push({ label, centroid });
    }

    // Calculate Euclidean distance between two centroids
    function euclideanDistance(c1, c2) {
        let sum = 0;
        for (const key of featureKeys) {
            const diff = c1[key] - c2[key];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    // Match each cluster to the closest labeled centroid
    const clusterToLabelMap = {};
    for (const clusterInfo of clusterCentroids) {
        let minDistance = Infinity;
        let bestLabel = null;
        
        for (const labelInfo of labeledCentroids) {
            const distance = euclideanDistance(clusterInfo.centroid, labelInfo.centroid);
            if (distance < minDistance) {
                minDistance = distance;
                bestLabel = labelInfo.label;
            }
        }
        
        clusterToLabelMap[clusterInfo.clusterId] = bestLabel;
        log(`Cluster ${clusterInfo.clusterId+1} matched to label "${bestLabel}" (distance: ${minDistance.toFixed(3)})`);
    }

    // Add cluster data with assigned labels to labeledFeatureVectors
    for (let i = 0; i < clusterData.length; i++) {
        const clusterId = clusterLabels[i];
        const assignedLabel = clusterToLabelMap[clusterId];
        
        if (assignedLabel) {
            const newFeatureVector = { ...clusterData[i], label: assignedLabel };
            labeledFeatureVectors.push(newFeatureVector);
        }
    }

    log(`Added ${clusterData.length} samples from clusters to labeled data`);
    log(`Total labeled samples: ${labeledFeatureVectors.length}`);
}

window.visualizeClusterLabeling = visualizeClusterLabeling;
window.assignLabelsToClusters = assignLabelsToClusters;


// Attach redraw handler to dropdowns
window.addEventListener('DOMContentLoaded', function() {
  const xSel = document.getElementById('labeledClusterX');
  const ySel = document.getElementById('labeledClusterY');
  if (xSel) xSel.addEventListener('change', visualizeClusterLabeling);
  if (ySel) ySel.addEventListener('change', visualizeClusterLabeling);
});