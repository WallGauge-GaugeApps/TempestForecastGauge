const cp = require('child_process');
const logPrefix = 'cmdLineComm.js | ';
var errorList = [];

class cmdLineCom {
    /**
     * This class uses the command line util gdbus to set and clear error messages on gdtMan.  Construct the class with the name of the gauge app.  These errors will be visable in the IOS app and WallGauge cloud.
     * The following will read the subscription status of the GDT (placed here just in case I want to use it in the future)
     * gdbus call --system --dest com.gdtMan --object-path /com/gdtMan --method org.freedesktop.DBus.Properties.GetAll com.gdtMan.gaugeCom
     *  Returns:
     *      ({'SubscriptionExpired': <false>},)
     * 
     * @param {string} gaugeAppName is the name of this gague app.  For example 'sensePowerGauge'
     */
    constructor(gaugeAppName = 'sensePowerGauge') {
        this.hostName = gaugeAppName
    };

    /**
     * Sends an error over dBus to gdtMan so it can be reported to WallGauge.com cloud and the IOS app.  Please make sure to clear the errors.
     * @param {string} errText 
     */
    sendError(errText = 'error Text Goes here') {
        try {
            cp.execSync('/usr/bin/gdbus call --system --dest com.gdtMan --object-path /com/gdtMan --method com.gdtMan.gaugeCom.Alert {\'"' + this.hostName + ' ' + errText + '":"1"\'}');
            logit('Added ' + errText + ' to list of errors sent to gdtMan.')
            errorList.push(errText);
        } catch (err) {
            logit('Error with sendError ');
            console.error('Error with sendError ', err);
        };
    };

    /**
     * Clears the last error matching errText. If you call sendError('this is my error'), you can clear that error by calling this method with the same text clearError('this is my error')
     * @param {*} errText 
     */
    clearError(errText = 'error Text Goes here') {
        try {
            cp.execSync('/usr/bin/gdbus call --system --dest com.gdtMan --object-path /com/gdtMan --method com.gdtMan.gaugeCom.Alert {\'"' + this.hostName + ' ' + errText + '":"0"\'}');
            errorList = errorList.filter(val => {
                if (val == errText) {
                    return false;
                } else {
                    return true;
                }
            });
            logit('Removed ' + errText + ' from error list.')
        } catch (err) {
            logit('Error with clearError ');
            console.error('Error with clearError ', err);
        };
    };

    /**
     * Clears all outstanding errors for this gauge app.
     */
    clearAllErrors() {
        try {
            errorList.forEach(val => {
                cp.execSync('/usr/bin/gdbus call --system --dest com.gdtMan --object-path /com/gdtMan --method com.gdtMan.gaugeCom.Alert {\'"' + this.hostName + ' ' + val + '":"0"\'}');
                logit('Removing error: ' + val);
            });
            errorList = [];
        } catch (err) {
            logit('Error with clearAllErrors ');
            console.error('Error with clearAllErrors ', err);
        };
    };
};

function logit(txt = '') {
    console.debug(logPrefix + txt);
};

module.exports = cmdLineCom;