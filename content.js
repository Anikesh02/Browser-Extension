chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageInfo") {
    const pageInfo = extractPageInfo();
    chrome.runtime.sendMessage({action: "storePageInfo", pageInfo: pageInfo});
  }
});

function extractPageInfo() {
  const pageInfo = {
    url: window.location.href,
    title: document.title,
    keywords: extractKeywords(),
    summary: extractSummary(),
    metadata: extractMetadata(),
    imageInfo: extractImageInfo(),
    timestamp: new Date().toISOString()
  };
  return pageInfo;
}

function extractKeywords() {
  const text = document.body.innerText;
  const words = text.toLowerCase().split(/\W+/);
  const wordCounts = {};
  words.forEach(word => {
    if (word.length > 3) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  });
  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(entry => entry[0]);
}

function extractSummary() {
  const text = document.body.innerText;
  const sentences = text.split(/[.!?]+/);
  return sentences.slice(0, 3).join('. ') + '.';
}

function extractMetadata() {
  const metadata = {};
  const metaTags = document.getElementsByTagName('meta');
  for (let i = 0; i < metaTags.length; i++) {
    const name = metaTags[i].getAttribute('name');
    const property = metaTags[i].getAttribute('property');
    const content = metaTags[i].getAttribute('content');
    if (name && content) metadata[name] = content;
    if (property && content) metadata[property] = content;
  }
  return metadata;
}

function extractImageInfo() {
  const images = Array.from(document.images);
  return images.map(img => ({
    src: img.src,
    alt: img.alt,
    width: img.width,
    height: img.height
  })).slice(0, 5);  
}