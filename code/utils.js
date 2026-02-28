function log(msg) {
  const logElem = document.getElementById("log");
  if (logElem) {
    logElem.textContent += msg + "\n";
    logElem.scrollTop = logElem.scrollHeight;
  }
  // Also log to browser console
  console.log(msg);
}

function clearLog() {
  document.getElementById("log").textContent = "";
}
