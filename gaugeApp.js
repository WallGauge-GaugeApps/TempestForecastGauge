const WxData = require('weatherflow-data-getter');
const MyAppMan = require('./MyAppManager.js');

const getCurrentWxInterval = 10;     // in minutes

var mainPoller = null;
var randomStart = getRandomInt(5000, 60000);

var wApi = {}       //new WxData();
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
            console.log('Re-Init WeatherFlow API with new config...');
            wApi = new WxData(myAppMan.config.apiKey);
        });

        myAppMan.on('apiKey', (newKey) => {
            console.log('A new apiKey event received.');
            myAppMan.setGaugeStatus('Received new apiKey.' + newKey);
            var objToSave = {
                apiKey: newKey
            }
            myAppMan.saveItem(objToSave);
        })

        console.log('First data call will occur in ' + (randomStart / 1000).toFixed(2) + ' seconds.');
        console.log('When a WeatherFlow API connection is established a poller will open and read weather data every ' + getCurrentWxInterval + ' minutes.');

        setTimeout(() => {
            if (myAppMan.config.apiKey == '' || myAppMan.config.apiKey == null) {
                console.warn('weatherFlow API Key not set.  Waiting for user to set value...');
                myAppMan.setGaugeStatus('weatherFlow API Key not set. Please set a new API Key for this station. ');
            } else {
                wApi = new WxData(myAppMan.config.apiKey);
                setupWxEvents();
            };
        }, randomStart);
    };
};

function setupWxEvents() {
    console.log('Setting up WX Events...');
    wApi.on('ready', () => {
        console.log('WX API ready for ' + wApi.station.publicName);
        getAllWxData();
    });

    wApi.on('errorStationMetaData', (err) => {
        console.error('Error with weatherflow-data-getter class construction.', err);
        myAppMan.setGaugeStatus('Error getting station Meta Data. Please check the API Key. ');
    });
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