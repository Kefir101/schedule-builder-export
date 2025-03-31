// export.js (Service Worker)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Authorize the user
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
            console.error("OAuth2 Error:", chrome.runtime.lastError.message);
            sendResponse({error: chrome.runtime.lastError.message});  // Send error back to content script
            return; // Exit if there is an error getting the token
        }

        let calendarId = request.calendarId !== null ? request.calendarId : "primary";
        const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

        Promise.all(request.events.map(event => { // Use Promise.all to handle multiple events concurrently
            return fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(event)
            })
            .then(response => {
                if (!response.ok) {
                    console.error("Calendar API Error:", response.status, response.statusText);
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json(); // Or response.text(), depending on expected response type
            })
            .catch(error => {
                console.error("Fetch Error:", error);
                // Handle errors for individual event creation
                return { error: error.message }; // Return an error object
            });
        }))
        .then(results => {
            // After all requests are complete...
            console.log("All calendar events processed", results);
            chrome.tabs.create({ url: "https://calendar.google.com" }); //link to calendar
            sendResponse({ success: true, results: results }); // Send confirmation and results back
        })
        .catch(error => {
            console.error("Overall Error:", error);
            sendResponse({error: error.message}); // Send a global error
        });
        return true; // Required for asynchronous sendResponse in service workers.
    });
    return true; // Required for asynchronous sendResponse
});
