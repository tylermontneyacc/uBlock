/*******************************************************************************

    uBlock Origin - a browser extension to block requests.
    Copyright (C) 2015-present Raymond Hill

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see {http://www.gnu.org/licenses/}.

    Home: https://github.com/gorhill/uBlock
*/

'use strict';

/******************************************************************************/

let buffer = null;
let lastReadTime = 0;
let writePtr = 0;

// After 30 seconds without being read, a buffer will be considered
// unused, and thus removed from memory.
const logBufferObsoleteAfter = 30 * 1000;

var httpLogger = null;

const janitor = ( ) => {
    if (
        buffer !== null &&
        lastReadTime < (Date.now() - logBufferObsoleteAfter)
    ) {
        logger.enabled = false;
        buffer = null;
        writePtr = 0;
        logger.ownerId = undefined;
        vAPI.messaging.broadcast({ what: 'loggerDisabled' });
    }
    if ( buffer !== null ) {
        vAPI.setTimeout(janitor, logBufferObsoleteAfter);
    }
};

const boxEntry = function(details) {
    if ( details.tstamp === undefined ) {
        details.tstamp = Date.now();
    }
    return JSON.stringify(details);
};

const logger = {
    enabled: true,
    logToPopup: false,
    logToHttp: false,
    ownerId: undefined,
    writeOne: function(details) {
        if(this.enabled){
            if(this.logToPopup){
                if ( buffer === null ) { return; }
                const box = boxEntry(details);
                if ( writePtr === buffer.length ) {
                    buffer.push(box);
                } else {
                    buffer[writePtr] = box;
                }
                writePtr += 1;
            }

            if(this.logToHttp){
                httpLogger.postMessage({'event': details});
            }
        }
    },
    readAll: function(ownerId) {
        this.ownerId = ownerId;
        if ( buffer === null ) {
            this.logToPopup = true;
            buffer = [];
            vAPI.setTimeout(janitor, logBufferObsoleteAfter);
        }
        const out = buffer.slice(0, writePtr);
        writePtr = 0;
        lastReadTime = Date.now();
        return out;
    },
};

logger.changeHiddenSettings = function(hs) {
    console.debug('Hidden settings have been changed');
    setLogToHttp(hs);
}

const setLogToHttp = function(hs){
    logger.logToHttp = hs.logToHttp;

    if(hs.logToHttp){
        if(httpLogger){
            console.debug('HTTP logging will be restarted');
            httpLogger.terminate();
        } else {
            console.debug('HTTP logging will be enabled');
        }

        httpLogger = new Worker('js/logger-http.js');
        httpLogger.postMessage({'settings': hs});
        httpLogger.postMessage({'start': null});
        
    }else if(httpLogger){
        console.debug('HTTP logging will be disabled');
        httpLogger.terminate();
    }
}

/******************************************************************************/

export default logger;

/******************************************************************************/
