document.addEventListener('DOMContentLoaded', () => {
  document.body.style.borderRadius = '50px';
  const toggleButton = document.getElementById('toggleLogging');
  const queryInput = document.getElementById('queryInput');
  const queryButton = document.getElementById('queryButton');
  const resultsContainer = document.getElementById('resultsContainer');
  
  const port = chrome.runtime.connect({name: 'popup'});

  chrome.runtime.sendMessage({action: "getLoggingStatus"}, (response) => {
    if (response) {
      updateButtonState(response.isLogging);
    }
  });

  toggleButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: "toggleLogging",
      value: toggleButton.textContent === "Start Logging"
    }, (response) => {
      if (response) {
        updateButtonState(response.isLogging);
      }
    });
  });

  function updateButtonState(isLogging) {
    toggleButton.textContent = isLogging ? "Stop Logging" : "Start Logging";
  }


  queryButton.addEventListener('click', () => {
    const query = queryInput.value;
    chrome.runtime.sendMessage({action: "queryHistory", query: query}, (results) => {
      displayResults(results);
    });
  });

  function displayResults(results) {
    resultsContainer.innerHTML = '';
    results.forEach(result => {
      const resultElement = document.createElement('div');
      resultElement.textContent = `${result.title} - ${new Date(result.timestamp).toLocaleString()}`;
      resultElement.addEventListener('click', () => {
        displayDetails(result);
      });
      resultsContainer.appendChild(resultElement);
    });
  }

  function displayDetails(result) {
    const detailsElement = document.createElement('div');
    detailsElement.innerHTML = `
      <h3>${result.title}</h3>
      <p>URL: <a href="${result.url}" target="_blank">${result.url}</a></p>
      <p>Keywords: ${result.keywords.join(', ')}</p>
      <p>Summary: ${result.summary}</p>
     <p>Images:</p>
      ${result.imageInfo.map(img => `<img src="${img.src}" alt="${img.alt}" style="max-width: 100px; max-height: 100px; margin: 5px;">`).join('')}
      <p>Screenshot:</p>
      ${result.screenshot ? `<img src="${result.screenshot}" alt="Page Screenshot" style="max-width: 300px; max-height: 300px; margin: 5px;">` : 'No screenshot available'}
    `;
    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(detailsElement);
  }
});