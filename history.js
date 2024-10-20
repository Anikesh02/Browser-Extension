document.addEventListener('DOMContentLoaded', () => {
    const historyContainer = document.getElementById('historyContainer');

    function updateHistory() {
        chrome.storage.local.get('history', (result) => {
            const history = result.history || [];
            if (history.length === 0) {
                historyContainer.innerHTML = '<p>No history entries found.</p>';
                return;
            }

            historyContainer.innerHTML = ''; // Clear existing entries

            history.reverse().forEach(entry => {
                const entryElement = document.createElement('div');
                entryElement.className = 'historyEntry';
                entryElement.innerHTML = `
                    <h3>${entry.title}</h3>
                    <p>URL: <a href="${entry.url}" target="_blank">${entry.url}</a></p>
                    <p>Visited on: ${new Date(entry.timestamp).toLocaleString()}</p>
                    <p class="keywords">Keywords: ${entry.keywords.join(', ')}</p>
                    <p class="summary">Summary: ${entry.summary}</p>
                    <p>Images:</p>
                    ${entry.imageInfo.map(img => `<img src="${img.src}" alt="${img.alt}" style="max-width: 100px; max-height: 100px; margin: 5px;">`).join('')}
                `;
                historyContainer.appendChild(entryElement);
            });
        });
    }

    updateHistory();

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'updateHistory') {
            updateHistory();
        }
    });
});