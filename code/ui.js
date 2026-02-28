// UI management: button state, event listeners, log clearing

function updateUIState() {
	if (document.getElementById("startBtn"))
		document.getElementById("startBtn").disabled = !uart;
	if (document.getElementById("stopBtn"))
		document.getElementById("stopBtn").disabled = !recording;
	if (document.getElementById("preprocessBtn"))
		document.getElementById("preprocessBtn").disabled = collectedSamples.length === 0;
	if (document.getElementById("trainBtn"))
		document.getElementById("trainBtn").disabled = featureVectors.length === 0;
	if (document.getElementById("startInferenceBtn"))
		document.getElementById("startInferenceBtn").disabled = !nn || !uart || inferencing;
	if (document.getElementById("stopInferenceBtn"))
		document.getElementById("stopInferenceBtn").disabled = !inferencing;
}

window.addEventListener("load", updateUIState);

