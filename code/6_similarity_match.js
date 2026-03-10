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
    // Use greedy assignment with conflict detection
    const clusterToLabelMap = {};
    const labelUsageCount = {};
    
    // Calculate all distances
    const distances = [];
    for (const clusterInfo of clusterCentroids) {
        for (const labelInfo of labeledCentroids) {
            distances.push({
                clusterId: clusterInfo.clusterId,
                label: labelInfo.label,
                distance: euclideanDistance(clusterInfo.centroid, labelInfo.centroid)
            });
        }
    }
    
    // Sort by distance (closest first)
    distances.sort((a, b) => a.distance - b.distance);
    
    // Assign clusters to labels, preferring closer matches
    // If clusters <= labels, try to use each label once
    const numLabels = labeledCentroids.length;
    const shouldPreferUnique = numClusters <= numLabels;
    
    for (const { clusterId, label, distance } of distances) {
        // Skip if cluster already assigned
        if (clusterToLabelMap[clusterId] !== undefined) continue;
        
        // If we should prefer unique assignments and this label is taken, skip if we can do better
        if (shouldPreferUnique && labelUsageCount[label] > 0) {
            // Check if there are unassigned labels left
            const unassignedLabels = labeledCentroids.filter(lc => !labelUsageCount[lc.label]);
            if (unassignedLabels.length > 0) continue;
        }
        
        clusterToLabelMap[clusterId] = label;
        labelUsageCount[label] = (labelUsageCount[label] || 0) + 1;
        log(`Cluster ${clusterId+1} matched to label "${label}" (distance: ${distance.toFixed(3)})`);
    }
    
    // Warn about multiple clusters mapping to same label
    const duplicateLabels = Object.entries(labelUsageCount).filter(([_, count]) => count > 1);
    if (duplicateLabels.length > 0) {
        log(`⚠ Warning: Multiple clusters assigned to same label(s):`);
        duplicateLabels.forEach(([label, count]) => {
            log(`  - "${label}" used by ${count} clusters`);
        });
    }
    
    // Warn about unused labels
    const unusedLabels = labeledCentroids.filter(lc => !labelUsageCount[lc.label]);
    if (unusedLabels.length > 0) {
        log(`⚠ Note: ${unusedLabels.length} label(s) not matched: ${unusedLabels.map(l => l.label).join(', ')}`);
        log(`  Consider using k=${numLabels} clusters for better label coverage`);
    }

    // Remove previously added cluster-based data (marked with _fromCluster flag)
    const originalLabeledCount = labeledFeatureVectors.length;
    labeledFeatureVectors = labeledFeatureVectors.filter(v => !v._fromCluster);
    const removedCount = originalLabeledCount - labeledFeatureVectors.length;
    if (removedCount > 0) {
        log(`Removed ${removedCount} previously assigned cluster samples to avoid duplicates`);
    }

    // Helper function to check if two feature vectors are identical (excluding label and flags)
    function areVectorsEqual(v1, v2) {
        for (const key of featureKeys) {
            if (Math.abs((v1[key] || 0) - (v2[key] || 0)) > 0.0001) {
                return false;
            }
        }
        return true;
    }

    // Add cluster data with assigned labels to labeledFeatureVectors
    // Skip samples that already exist in manually labeled data
    let addedCount = 0;
    let skippedDuplicates = 0;
    
    for (let i = 0; i < clusterData.length; i++) {
        const clusterId = clusterLabels[i];
        const assignedLabel = clusterToLabelMap[clusterId];
        
        if (assignedLabel) {
            // Check if this feature vector already exists in labeled data
            const isDuplicate = labeledFeatureVectors.some(existing => 
                !existing._fromCluster && areVectorsEqual(clusterData[i], existing)
            );
            
            if (isDuplicate) {
                skippedDuplicates++;
            } else {
                const newFeatureVector = { ...clusterData[i], label: assignedLabel, _fromCluster: true };
                labeledFeatureVectors.push(newFeatureVector);
                addedCount++;
            }
        }
    }

    log(`Added ${addedCount} samples from clusters to labeled data`);
    if (skippedDuplicates > 0) {
        log(`Skipped ${skippedDuplicates} duplicates that already existed in manually labeled data`);
    }
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