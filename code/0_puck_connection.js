// Puck.js connection and data handling
let uart;

function connectToPuck() {
	UART.connect(function (connection) {
		if (!connection) {
			log("Error when connecting! Try again.");
			return;
		}
		uart = connection;
		log("Connected to Puck.js");
		updateUIState();

		uart.on("data", function (data) {
			handleIncomingData(data);
		});

		uart.on("close", function () {
			log("Disconnected from Puck.js");
			uart = null;
			updateUIState();
		});
	});
}

function handleIncomingData(data) {
	if (!handleIncomingData.buffer) handleIncomingData.buffer = "";
	handleIncomingData.buffer += data;
	let index = handleIncomingData.buffer.indexOf("\n");
	while (index >= 0) {
		const line = handleIncomingData.buffer.substring(0, index);
		handleIncomingData.buffer = handleIncomingData.buffer.substring(index + 1);
		try {
			const sample = JSON.parse(line);
			processSample(sample);
		} catch (e) {
			// skip malformed data
		}
		index = handleIncomingData.buffer.indexOf("\n");
	}
}

function processSample(sample) {
	if (recording) {
		sample.label = currentLabel;
		sample.timestamp = Date.now();
		collectedSamples.push(sample);
		updateUIState();
	} else if (inferencing && nn) {
		inferClass(sample);
	}
}

function sendCommand(cmd) {
	if (uart) uart.write(cmd);
}
