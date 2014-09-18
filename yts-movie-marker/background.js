
function onRequest(request, sender, sendResponse) {
	chrome.pageAction.show(sender.tab.id);
}
chrome.extension.onRequest.addListener(onRequest);

