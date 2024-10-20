document.addEventListener('DOMContentLoaded', () => {
    chrome.runtime.sendMessage({action: "getHistoryData"}, (response) => {
        const jsonResponse = document.getElementById('json-response');
        jsonResponse.textContent = JSON.stringify(response.history, null, 2);
        document.contentType = 'application/json';
    });
});