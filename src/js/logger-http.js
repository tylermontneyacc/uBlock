var settings = null;
var cache = [];

// Validate 'logToHttpHost' as valid ip/url
// Validate 'logToHttpPortNumber' as valid TCP/UDP port number

onmessage = function (event) {
    if (settings == null && 'settings' in event.data) {
        settings = event.data['settings'];

        if (settings.logToHttpByTimeout == null || settings.logToHttpByTimeout == undefined || settings.logToHttpByTimeout < 1000) {
            console.error("HTTP logger queue logToHttpByTimeout value must be at least 1000 ms!");
            terminate();
        }
    }
    else if ('event' in event.data) {
        cache.push(event.data['event']);
        // chrome.storage.local.get(['logToHttpQueue'], function (result) {
        //     if (result == null || result == undefined) {
        //         chrome.storage.local.set({ logToHttpQueue: event.data['event'] }, function () {
        //             console.debug("logToHttpQueue array initialized");
        //         });
        //     } else {
        //         result += event.data['event'];
        //         chrome.storage.local.set({ logToHttpQueue: result }, function () {
        //             console.debug("logToHttpQueue item added");
        //         });
        //     }
        // });
    } else if ('start' in event.data) {
        setInterval(httpWorker, settings.logToHttpByTimeout);
    }
}

const httpWorker = function () {
    console.debug('Starting HTTP logging interval, ' + settings.logToHttpByTimeout.toString() + ' ms');
    //chrome.storage.local.get(['logToHttpQueue'], function (result) {
    //if (result != null && result != undefined && result.length > 0) {
    if (cache.length > 0) {
        //console.debug('Found ' + value.length.toString() + ' logs to send over HTTP');
        console.debug('Found ' + cache.length.toString() + ' logs to send over HTTP');

        var url = settings.logToHttpHost + ':' + settings.logToHttpPortNumber.toString();
        if (settings.logToHttpSecure) {
            url = 'https://' + url;
        } else {
            url = 'http://' + url;
        }

        console.debug('HTTP logging to URL: ' + url);

        var httpRequest = new XMLHttpRequest();
        httpRequest.open('POST', url);
        //httpRequest.send(JSON.stringify(result));
        httpRequest.send(JSON.stringify(cache));

        httpRequest.onerror = function (e) {
            // Not sure if UBO logs differently than this
            // Should improve this message
            console.error('HTTP logging encountered an error');

            // Option to prevent clearing on HTTP error
        };

        console.debug('logToHttpQueue array cleared');
        cache = [];

        // Assuming this nulls the value
        //chrome.storage.local.clear();
    } else {
        console.debug('No logs to send over HTTP.');
    }
    //});
}