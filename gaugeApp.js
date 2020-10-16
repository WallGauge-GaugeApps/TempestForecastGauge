const WxData = require('weatherflow-data-getter');
const MyAppMan = require('./MyAppManager.js');

const reconnectInterval = 60;    // in minutes
const getTrendInterval = 10;     // in minutes

var mainPoller = null;
var randomStart = getRandomInt(5000, 60000);

var wApi = new WxData();
var myAppMan = {};

class gaugeApp {
    /**
     * The gauge app connects a WallGauge to its data source.  
     * The data source is often an Internet API and is parsed and presented to the gauge app with a data delegate class. 
     * To enable encryption pass this class an encryption key as the encryptionKey parameter during class construction. 
     * This will start appManager with encryption enabled and store all user modified variables like user ID and Password in the modifiedConfig.encrypted file. 
     * @param {string} encryptionKey Defults to null for no encryption. 
     */
    constructor(encryptionKey = null) {
        if (encryptionKey == null) {
            myAppMan = new MyAppMan(__dirname + '/gaugeConfig.json', __dirname + '/modifiedConfig.json', false);
        } else {
            myAppMan = new MyAppMan(__dirname + '/gaugeConfig.json', __dirname + '/modifiedConfig.encrypted', true, encryptionKey);
        };
        // console.log('Establishing connection for secondary gauges to irTransmitter...');

        myAppMan.on('Update', () => {
            console.log('New update event has fired.  Reloading gauge objects...');
            myAppMan.setGaugeStatus('Config updated received. Please wait, may take up to 5 minutes to reload gauge objects. ' + (new Date()).toLocaleTimeString() + ', ' + (new Date()).toLocaleDateString());
            clearInterval(mainPoller);
            console.log('Re-Init senseData with new config...');
            wApi = new WxData(myAppMan.config.apiKey);
        });

        myAppMan.on('userPW', () => {
            console.log('A new user PW event received.');
            if (myAppMan.userID != 'notSet' && myAppMan.userPW != 'notSet') {
                console.log('Received new user ID and Password. ');
                myAppMan.setGaugeStatus('Received new user ID and Password.');
                var objToSave = {
                    userID: myAppMan.userID,
                    userPW: myAppMan.userPW
                };
                myAppMan.saveItem(objToSave);
            } else {
                console.log('Login ID and Password must both be set.  Enter login ID first then password. Try agian in that order.');
                myAppMan.setGaugeStatus('Login ID and Password must both be set.  Enter login ID first then password. Try agian in that order.');
            };
            myAppMan.userID = 'notSet';
            myAppMan.userPW = 'notSet';
        });

        console.log('First data call will occur in ' + (randomStart / 1000).toFixed(2) + ' seconds.');
        console.log('When a Sense connection is established a poller will open and close a web socket every 1 minute, read trend data every ' + getTrendInterval + ' minutes, and re-authenticate every ' + reconnectInterval + ' minutes.');

        setTimeout(() => {
            wApi = new WxData(myAppMan.config.apiKey);
            setupWxEvents();
        }, randomStart);
    };
};

function setupWxEvents() {
    wApi.on('ready', () => {
        console.log('WX API ready for ' + wApi.station.publicName);
        getAllWxData();
    })
};

function getAllWxData() {
    console.log('Getting current conditons for ' + wApi.station.publicName)
    wApi.getCurrent()
        .then((rslt) => {
            console.log('Get current complete. Observation Date = ' + wApi.data.obsDate);
            console.dir(wApi.data.current, { depth: null });
            console.log('Here is the lightning information:')
            console.dir(wApi.data.lightning, { depth: null });
            console.log('Getting Forecast...')
            return wApi.getForecast()
        })
        .then((rslt) => {
            console.log("Get forecast complete:");
            console.dir(wApi.data.forecast, { depth: null });
            console.log('Getting all rain history....');
            return wApi.updateAllHistoryValues()
        })
        .then((rslt) => {
            console.log('Get rain history complete:');
            console.dir(wApi.data.history, { depth: null })
        })
        .catch((err) => {
            console.error('Error calling wApi:', err);
        })
};

function startPoller() {
    console.log('Starting endless poller.');
    clearInterval(mainPoller);
    mainPoller = setInterval(() => {
        //put polling calls here
    }, 60000);
};

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
};


module.exports = gaugeApp;