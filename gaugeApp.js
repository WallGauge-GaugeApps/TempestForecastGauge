const WxData = require('weatherflow-data-getter');
const MyAppMan = require('./MyAppManager.js');
const irTransmitter = require('irdtxclass');
const gcForecastHigh = require('./secondaryGauges/ForecastHigh.json');
const gcForecastLow = require('./secondaryGauges/ForecastLow.json');
const gcPrecipChance = require('./secondaryGauges/PrecipChance.json');

const getCurrentWxInterval = 5;     // in minutes
const getForecastInteral = 15;      // in minutes

var getCurrentPollerTimer = null;
var getForecastPollerTimer = null;
var randomStart = getRandomInt(5000, 60000);

var inAlert = false;
// var wApi = new WxData();
var wApi = {};
var myAppMan = {};
var sgFCastHigh = {};
var sgFCastLow = {};
var sgPrecip = {};

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
        console.log('Establishing connection for secondary gauges to irTransmitter...');
        sgFCastHigh = new irTransmitter(gcForecastHigh.gaugeIrAddress, gcForecastHigh.calibrationTable);
        sgFCastLow = new irTransmitter(gcForecastLow.gaugeIrAddress, gcForecastLow.calibrationTable);
        sgPrecip = new irTransmitter(gcPrecipChance.gaugeIrAddress, gcPrecipChance.calibrationTable);

        myAppMan.on('Update', () => {
            console.log('New update event has fired.  Reloading gauge objects...');
            if (myAppMan.config.apiKey == '' || myAppMan.config.apiKey == null) {
                console.warn('weatherFlow API Key not set.  Waiting for user to set value...');
                myAppMan.setGaugeStatus('weatherFlow API Key not set. Please set a new API Key for this station. ');
                if (inAlert == false) {
                    myAppMan.sendAlert({ [myAppMan.config.descripition]: "1" });
                    inAlert = true;
                };
            } else {
                myAppMan.setGaugeStatus('Config updated received. Please wait, may take up to 5 minutes to reload gauge objects. ' + (new Date()).toLocaleTimeString() + ', ' + (new Date()).toLocaleDateString());
                clearInterval(getCurrentPollerTimer);
                console.log('Re-Init WeatherFlow API with new config...');
                wApi = new WxData(myAppMan.config.apiKey);
                setupWxEvents();
            };
        });

        myAppMan.on('apiKey', (newKey) => {
            console.log('A new apiKey event received. ');
            myAppMan.setGaugeStatus('Received new apiKey.');
        })

        console.log('First data call will occur in ' + (randomStart / 1000).toFixed(2) + ' seconds.');
        console.log('When a WeatherFlow API connection is established a poller will open and read weather data every ' + getCurrentWxInterval + ' minutes, and forecast data every ' + getForecastInteral + ' minutes.');

        setTimeout(() => {
            if (myAppMan.config.apiKey == '' || myAppMan.config.apiKey == null) {
                console.warn('weatherFlow API Key not set.  Waiting for user to set value...');
                myAppMan.setGaugeStatus('weatherFlow API Key not set. Please set a new API Key for this station. ');
                if (inAlert == false) {
                    myAppMan.sendAlert({ [myAppMan.config.descripition]: "1" });
                    inAlert = true;
                };
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
        console.log('WeatherFlow API ready to receive calls for station named: ' + wApi.station.publicName);
        getAllWxData();
        getCurrentPoller();
        getForecastPoller();
    });

    wApi.on('errorStationMetaData', (err) => {
        console.error('Error with weatherflow-data-getter class construction.', err);
        myAppMan.setGaugeStatus('Error getting station Meta Data. Please check the API Key. ');
        if (inAlert == false) {
            myAppMan.sendAlert({ [myAppMan.config.descripition]: "1" });
            inAlert = true;
        };
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
            myAppMan.setGaugeValue(wApi.data.current.temp, '°F, ' +
                wApi.data.forecast.maxTemp + "°F, " +
                wApi.data.forecast.minTemp + "°F, " +
                wApi.data.forecast.precipChance + "%, obs = " +
                wApi.data.obsDate
            );
            myAppMan.setGaugeStatus('Okay, ' + (new Date()).toLocaleTimeString() + ', ' + (new Date()).toLocaleDateString());
            if (inAlert == true) {
                myAppMan.sendAlert({ [myAppMan.config.descripition]: "0" });
                inAlert = false;
            };
            sgFCastHigh.sendValue(wApi.data.forecast.maxTemp);
            sgFCastLow.sendValue(wApi.data.forecast.minTemp);
            sgPrecip.sendValue(wApi.data.forecast.precipChance);
        })
        .catch((err) => {
            console.error('Error calling wApi:', err);
            try {
                myAppMan.setGaugeStatus('Error getting all weather data. ');
                if (inAlert == false) {
                    myAppMan.sendAlert({ [myAppMan.config.descripition]: "1" });
                    inAlert = true;
                };
            } catch (e) { }
        })
};

function getCurrentConditions() {
    console.log('Requesting current weater...');
    wApi.getCurrent()
        .then((rslt) => {
            console.log('Wx for: ' + wApi.data.obsDate + ', current = ' +
                wApi.data.current.temp, '°F, max = ' +
                wApi.data.forecast.maxTemp + "°F, min = " +
                wApi.data.forecast.minTemp + "°F, precip =" +
                wApi.data.forecast.precipChance + "%."
            );
            myAppMan.setGaugeValue(wApi.data.current.temp, '°F, ' +
                wApi.data.forecast.maxTemp + "°F, " +
                wApi.data.forecast.minTemp + "°F, " +
                wApi.data.forecast.precipChance + "%, obs = " +
                wApi.data.obsDate
            );
            myAppMan.setGaugeStatus('Okay, ' + (new Date()).toLocaleTimeString() + ', ' + (new Date()).toLocaleDateString());
            if (inAlert == true) {
                myAppMan.sendAlert({ [myAppMan.config.descripition]: "0" });
                inAlert = false;
            };
            sgFCastHigh.sendValue(wApi.data.forecast.maxTemp);
            sgFCastLow.sendValue(wApi.data.forecast.minTemp);
            sgPrecip.sendValue(wApi.data.forecast.precipChance);
        })
        .catch((err) => {
            console.error('Error calling wApi:', err);
            try {
                myAppMan.setGaugeStatus('Error getting current weather conditions. ');
                if (inAlert == false) {
                    myAppMan.sendAlert({ [myAppMan.config.descripition]: "1" });
                    inAlert = true;
                };
            } catch (e) { }
        })
};

function getTodaysForecast() {
    console.log("Requesting Today's Forecast...");
    wApi.getForecast()
        .then((rslt) => {
            console.log('Wx for: ' + wApi.data.obsDate + ', current = ' +
                wApi.data.current.temp, '°F, max = ' +
                wApi.data.forecast.maxTemp + "°F, min = " +
                wApi.data.forecast.minTemp + "°F, precip =" +
                wApi.data.forecast.precipChance + "%."
            );
            myAppMan.setGaugeValue(wApi.data.current.temp, '°F, ' +
                wApi.data.forecast.maxTemp + "°F, " +
                wApi.data.forecast.minTemp + "°F, " +
                wApi.data.forecast.precipChance + "%, obs = " +
                wApi.data.obsDate
            );
            myAppMan.setGaugeStatus('Okay, ' + (new Date()).toLocaleTimeString() + ', ' + (new Date()).toLocaleDateString());
            if (inAlert == true) {
                myAppMan.sendAlert({ [myAppMan.config.descripition]: "0" });
                inAlert = false;
            };
            sgFCastHigh.sendValue(wApi.data.forecast.maxTemp);
            sgFCastLow.sendValue(wApi.data.forecast.minTemp);
            sgPrecip.sendValue(wApi.data.forecast.precipChance);
        })
        .catch((err) => {
            console.error('Error calling wApi:', err);
            try {
                myAppMan.setGaugeStatus('Error getting Today\`s forecast. ');
                if (inAlert == false) {
                    myAppMan.sendAlert({ [myAppMan.config.descripition]: "1" });
                    inAlert = true;
                };
            } catch (e) { }
        })
};

function getCurrentPoller() {
    console.log('Starting get current WX conditions poller.  It will update every ' + getCurrentWxInterval + ' minutes.');
    clearInterval(getCurrentPollerTimer);
    getCurrentPoller = setInterval(() => {
        getCurrentConditions();
    }, getCurrentWxInterval * 60000);
};

function getForecastPoller() {
    console.log('Starting get today\`s forecast poller.  It will update every ' + getForecastInteral + ' minutes.');
    clearInterval(getForecastPollerTimer);
    getForecastPollerTimer = setInterval(() => {
        getTodaysForecast();
    }, getForecastInteral * 60000);
};

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
};


module.exports = gaugeApp;