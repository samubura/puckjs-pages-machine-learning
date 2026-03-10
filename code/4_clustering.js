// Clustering step logic

function runClustering() {
  if (!featureVectors || !featureVectors.length) {
    log("No preprocessed features to cluster. Please run preprocessing first.");
    return;
  }
  // Cluster on all features except 'label'
  const featureKeys = Object.keys(featureVectors[0]).filter(k => k !== 'label');
  const allFeatureData = featureVectors.map(f => featureKeys.map(k => f[k]));
  const k = parseInt(document.getElementById('numClusters').value, 10) || 4;
  const options = { k, maxIter: 5, threshold: 0.5 };
  window.kmeansModel = ml5.kmeans(allFeatureData, options, modelReady);

  function modelReady() {
    if (!window.kmeansModel || !window.kmeansModel.dataset) {
      log('K-means failed: no dataset.');
      return;
    }
    // Extract cluster assignments
    const clusteredData = window.kmeansModel.dataset;
    window.lastClusterAssignments = clusteredData.map(d => d.centroid);
    window.lastClusterCentroids = window.kmeansModel.centroids;
    log(`Clustering complete. ${k} clusters formed.`);
    redrawClusterVisualization();
  }
}

function redrawClusterVisualization() {
  if (!featureVectors || !featureVectors.length || !window.lastClusterAssignments) {
    log('No clustering results to visualize.');
    return;
  }
  const xFeature = document.getElementById('clusterFeatureX').value;
  const yFeature = document.getElementById('clusterFeatureY').value;
  const dataPoints2D = featureVectors.map(f => [f[xFeature], f[yFeature]]);
  visualizeClusters2D(dataPoints2D, window.lastClusterAssignments, xFeature, yFeature);
}

// Attach redraw handler to dropdowns
window.addEventListener('DOMContentLoaded', function() {
  const xSel = document.getElementById('clusterFeatureX');
  const ySel = document.getElementById('clusterFeatureY');
  if (xSel) xSel.addEventListener('change', redrawClusterVisualization);
  if (ySel) ySel.addEventListener('change', redrawClusterVisualization);
});

window.runClustering = runClustering;
window.redrawClusterVisualization = redrawClusterVisualization;

function visualizeClusters2D(dataPoints, labels, xFeature, yFeature) {
  const chartCanvas = document.getElementById('clusterChart');
  const ctx = chartCanvas.getContext('2d');
  // Prepare data grouped by cluster
  const k = Math.max(...labels) + 1;
const colors = [
    'rgba(255, 99, 132, 0.7)',
    'rgba(54, 162, 235, 0.7)',
    'rgba(255, 206, 86, 0.7)',
    'rgba(75, 192, 192, 0.7)',
    'rgba(153, 102, 255, 0.7)',
    'rgba(255, 159, 64, 0.7)',
    'rgba(199, 199, 199, 0.7)',
    'rgba(83, 102, 255, 0.7)',
    'rgba(255, 99, 178, 0.7)',
    'rgba(99, 255, 132, 0.7)',
    'rgba(255, 178, 99, 0.7)',
    'rgba(132, 99, 255, 0.7)'
];
  const datasets = [];
  for (let i = 0; i < k; i++) {
    const clusterPoints = dataPoints
      .map((pt, idx) => ({ pt, idx }))
      .filter(obj => labels[obj.idx] === i)
      .map(obj => ({ x: obj.pt[0], y: obj.pt[1] }));
    datasets.push({
      label: `Cluster ${i + 1}`,
      data: clusterPoints,
      backgroundColor: colors[i % colors.length],
      pointRadius: 5
    });
  }
  if (window.clusterChart && typeof window.clusterChart.destroy === 'function') {
    window.clusterChart.destroy();
  }
  window.clusterChart = new Chart(ctx, {
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

function updateClusterFeatureDropdowns() {
  const xSel = document.getElementById('clusterFeatureX');
  const ySel = document.getElementById('clusterFeatureY');
  if (!featureVectors || !featureVectors.length) return;
  const keys = Object.keys(featureVectors[0]).filter(k => k !== 'label');
  xSel.innerHTML = '';
  ySel.innerHTML = '';
  keys.forEach(f => {
    let optX = document.createElement('option');
    optX.value = f; optX.textContent = f;
    xSel.appendChild(optX);
    let optY = document.createElement('option');
    optY.value = f; optY.textContent = f;
    ySel.appendChild(optY);
  });
  if (keys.length > 1) {
    xSel.value = keys[0];
    ySel.value = keys[1];
  }
}
window.updateClusterFeatureDropdowns = updateClusterFeatureDropdowns;


