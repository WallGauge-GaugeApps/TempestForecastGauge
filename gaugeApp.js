const WxData = require('weatherflow-data-getter');
const MyAppMan = require('./MyAppManager.js');
const irTransmitter = require('irdtxclass');
const gcForecastHigh = require('./secondaryGauges/ForecastHigh.json');
const gcForecastLow = require('./secondaryGauges/ForecastLow.json');
const gcPrecipCombo = require('./secondaryGauges/PrcpChanceAccumulationCombo.json');
const gcAccPrecp7Day = require('./secondaryGauges/Precp7Day.json');
const gcWindAvg = require('./secondaryGauges//WindSpeed.json');

const getCurrentWxInterval = 150;    // in seconds
const getForecastInterval = 16;     // in minutes
const getHistoryInterval = 59;      // in minutes

var getCurrentPollerTimer = null;
var getForecastPollerTimer = null;
var getHistoryPollerTimer = null;
var retryOnErrorTimer = null;
var randomStart = getRandomInt(5000, 60000);

var inAlert = false;
// var wApi = new WxData();
var wApi = {};
var myAppMan = {};
var sgFCastHigh = {};
var sgFCastLow = {};
var sgPrecipCombo = {};
var sgPrecip7Day = {};
var sgWindSpeed = {};

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
        sgPrecipCombo = new irTransmitter(gcPrecipCombo.gaugeIrAddress, gcPrecipCombo.calibrationTable);
        sgPrecip7Day = new irTransmitter(gcAccPrecp7Day.gaugeIrAddress, gcAccPrecp7Day.calibrationTable);
        sgWindSpeed = new irTransmitter(gcWindAvg.gaugeIrAddress, gcWindAvg.calibrationTable);

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
                clearInterval(getForecastPollerTimer);
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
        console.log('When a WeatherFlow API connection is established a poller will open and read weather data every ' + getCurrentWxInterval + ' minutes, and forecast data every ' + getForecastInterval + ' minutes.');

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
    let retrySeconds = 60
    clearTimeout(retryOnErrorTimer);
    console.log('Setting up WX Events...');
    wApi.on('ready', () => {
        console.log('WeatherFlow API ready to receive calls for station named: ' + wApi.station.publicName);
        getAllWxData();
        getCurrentPoller();
        getForecastPoller();
        getHistoryPoller();
    });

    wApi.on('errorStationMetaData', (err) => {
        console.error('Error with weatherflow-data-getter class construction.', err);
        if ((typeof err) == 'object' && err.hasOwnProperty('status_code')) {
            if (err.status_code == 401) {
                console.log('setting Gauge Status = Error. Unauthorized. Please check the API Key. ')
                myAppMan.setGaugeStatus('Error. API Key Unauthorized. Retrying in 60s.');
            } else if (err.status_code == 429) {
                console.log('setting Gauge Status = Warning. Too Many Requests. Please check the API Key. ')
                myAppMan.setGaugeStatus('Warning: Too many request retrying in 10s.');
                retrySeconds = 10;
            } else {
                console.log('Setting Gauge Status = Error. ' + err.status_code + ' ' + err.status_message + '.');
                myAppMan.setGaugeStatus('Error. ' + err.status_code + ' ' + err.status_message + ', retrying in 60s.');
            };
        } else {
            myAppMan.setGaugeStatus('Error getting station Meta Data. Please check the API Key. Retrying in 60s.');
        };

        if (inAlert == false) {
            myAppMan.sendAlert({ [myAppMan.config.descripition]: "1" });
            inAlert = true;
        };

        console.log('Will retry weatherflow-data-getter class construction in 60 seconds...');
        clearTimeout(retryOnErrorTimer);
        retryOnErrorTimer = setTimeout(() => {
            console.log('Retrying weatherflow-data-getter class construction...')
            wApi = new WxData(myAppMan.config.apiKey);
            setupWxEvents();
        }, retrySeconds * 1000);

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
            console.log('Getting Accumulated Precip History...')
            return wApi.updateMonthHistoryValues()
        })
        .then((rslt) => {
            console.log('Precip event (not including todays amount) = ' + wApi.data.history.precipEvent + '".');
            console.log('7 day accumulsated precip = ' + wApi.data.history.precipLast7Days + '".');
            console.log('Getting Forecast...');
            return wApi.getForecast()
        })
        .then((rslt) => {
            console.log("Get forecast complete:");
            console.dir(wApi.data.forecast, { depth: null });
            txGaugeData()
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
            txGaugeData();
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
            txGaugeData();
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

function getHistory() {
    console.log("Updating monthly weather history...");
    wApi.updateMonthHistoryValues()
        .then((rslt) => {
            console.log('History updateded, sending new values...');
            txGaugeData();
        })
        .catch((err) => {
            console.error('Error calling wApi:', err);
            try {
                myAppMan.setGaugeStatus('Error Updating monthly weather history.... ');
                if (inAlert == false) {
                    myAppMan.sendAlert({ [myAppMan.config.descripition]: "1" });
                    inAlert = true;
                };
            } catch (e) { }
        })
};

function txGaugeData() {
    let w7day = Number(wApi.data.history.precipLast7Days + wApi.data.current.precip).toFixed(2);
    console.log('Wx for: ' + wApi.data.obsDate + ', current = ' +
        wApi.data.current.temp, '°F, max = ' +
        wApi.data.forecast.maxTemp + "°F, " +
        wApi.data.forecast.minTemp + "°F, " +
        wApi.data.forecast.precipChance + "%, " +
        wApi.data.current.precip + '", ' +
        w7day + '", ' +
        wApi.data.current.wind + "mph."
    );
    myAppMan.setGaugeValue(wApi.data.current.temp, '°F, ' +
        wApi.data.forecast.maxTemp + "°F, " +
        wApi.data.forecast.minTemp + "°F, " +
        wApi.data.forecast.precipChance + "%, " +
        wApi.data.current.precip + '",  ' +
        w7day + '", ' +
        wApi.data.current.wind + "mph," +
        " obs = " + wApi.data.obsDate
    );
    myAppMan.setGaugeStatus('Okay, ' + (new Date()).toLocaleTimeString() + ', ' + (new Date()).toLocaleDateString());
    if (inAlert == true) {
        myAppMan.sendAlert({ [myAppMan.config.descripition]: "0" });
        inAlert = false;
    };
    sgFCastHigh.sendValue(wApi.data.forecast.maxTemp);
    sgFCastLow.sendValue(wApi.data.forecast.minTemp);
    if (wApi.data.current.precip > 0) {
        sgPrecipCombo.sendValue(wApi.data.current.precip);
    } else {
        sgPrecipCombo.sendValue(wApi.data.forecast.precipChance * -1);
    };
    sgPrecip7Day.sendValue(wApi.data.history.precipLast7Days + wApi.data.current.precip);
    sgWindSpeed.sendValue(wApi.data.current.wind)
}

function getCurrentPoller() {
    console.log('Starting get current WX conditions poller.  It will update every ' + getCurrentWxInterval + ' seconds.');
    clearInterval(getCurrentPollerTimer);
    getCurrentPollerTimer = setInterval(() => {
        getCurrentConditions();
    }, getCurrentWxInterval * 1000);
};

function getForecastPoller() {
    console.log('Starting get today\`s forecast poller.  It will update every ' + getForecastInterval + ' minutes.');
    clearInterval(getForecastPollerTimer);
    getForecastPollerTimer = setInterval(() => {
        getTodaysForecast();
    }, getForecastInterval * 60000);
};

function getHistoryPoller() {
    console.log('Starting get weather history poller.  It will update every ' + getHistoryInterval + ' minutes.');
    clearInterval(getHistoryPollerTimer);
    getHistoryPollerTimer = setInterval(() => {
        getHistory();
    }, getHistoryInterval * 60000);
};

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
};


module.exports = gaugeApp;