// Raw data visualization step logic
let rawDataChart = null;

function drawRawDataChart(samples) {
	const ctx = document.getElementById("rawDataChart").getContext("2d");
	if (rawDataChart) {
		rawDataChart.destroy();
	}
	const labels = samples.map((s, i) => i);
	// Support both flat and nested (acc/gyro) sample structure
	const ax = samples.map(s => s.acc ? s.acc.x : s.ax);
	const ay = samples.map(s => s.acc ? s.acc.y : s.ay);
	const az = samples.map(s => s.acc ? s.acc.z : s.az);
	const gx = samples.map(s => s.gyro ? s.gyro.x : s.gx);
	const gy = samples.map(s => s.gyro ? s.gyro.y : s.gy);
	const gz = samples.map(s => s.gyro ? s.gyro.z : s.gz);
	rawDataChart = new Chart(ctx, {
		type: "line",
		data: {
			labels,
			datasets: [
				{ label: "ax", data: ax, borderColor: "red", fill: false },
				{ label: "ay", data: ay, borderColor: "green", fill: false },
				{ label: "az", data: az, borderColor: "blue", fill: false },
				{ label: "gx", data: gx, borderColor: "orange", fill: false },
				{ label: "gy", data: gy, borderColor: "purple", fill: false },
				{ label: "gz", data: gz, borderColor: "brown", fill: false },
			]
		},
		options: {
            responsive: true,
			plugins: {
				legend: { display: true }
			},
			scales: {
				x: { display: true },
				y: { display: true }
			}
		}
	});
}

function visualizeRawData() {
	if (!collectedSamples.length) {
		log("No raw data to visualize.");
		return;
	}
	drawRawDataChart(collectedSamples);
}

// Expose for UI
window.visualizeRawData = visualizeRawData;

