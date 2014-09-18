
function onRequest(request, sender, sendResponse) {
	chrome.pageAction.show(sender.tab.id);
}
chrome.extension.onRequest.addListener(onRequest);

/* <div>Icons made by Freepik from 
 * <a href="http://www.flaticon.com" title="Flaticon">www.flaticon.com</a> 
 * is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" 
 * title="Creative Commons BY 3.0">CC BY 3.0</a></div>
 */
