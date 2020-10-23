# Tempest Forecast Gauge Help

The goal of this gauge is with one glance give the observer a quick feel for what the weather was going to look like for the day. We do this by mixing current weather observations (current temperature) with forcast data for the current day all on one gague face.

The Tempest Weather WallGauge is a collection of four gauges on one gauge face:

- Outside ring (main gauge). The main gauge shows the current outside temperature observed at your Tempest.  The values on this gauge are in degrees Fahrenheit.
- Forecast Low Temperature (upper left gauge). This gauge shows the forecast low temperature for the day in degrees Fahrenheit.
- Forecast High Temperature (upper right gauge). This gauge shows the forecast high temperature for the day in degrees Fahrenheit.
- Chance of Precipitation (bottom center gauge). This gauge has a range from 0 to 100 percent.  It shows the likelihood of precipitation for the day.

The current temperature is updated every 5 minutes and the forecast data is updated every 15 minutes.

## How to get a Personal Use Token

The WallGauge GDT accesses your Tempest weather data through a secure connection to [WeatherFlow’s Smart Weather API](https://weatherflow.github.io/SmartWeather/api/#object-model).  In order for this GDT to find and access your Tempest weather data you will need to create a personal use token with your tempestwx.com account.  Once you create the token you will then need to use the [GDT Administrator iPhone app](https://www.wallgauge.com/a) to type it in or paste it into the GDT Administrator's API Key or Token field.  See the instructions below for details.

### Instructions

 1. Go to [https://tempestwx.com/settings/tokens](https://tempestwx.com/settings/tokens) and login with the same user ID and Password you used to setup your tempest weather station.
 2. Tap on the Create Token button to crate a new token.
 3. For the Token Name type in `WallGauge GDT` and push the create token button.
 4. Tap on the "Copy" button to copy the new token to your clipboard.
 5. Go back to the GDT Administrator and paste it into the Token window.

### [Video Instructions](https://youtu.be/xGuKNiLO4ZA)

<iframe width="560" height="315" src="https://www.youtube.com/embed/xGuKNiLO4ZA" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

### Error indicators

At the bottom of the main gauge you will find two error indicators labeled “Check data connection” and “Renew subscription”.

- Check data connection. If the GDT is powered off or cannot connect to the data source it will stop sending infrared data to this gauge.  If the gauge does not receive data for 20 minutes it will move the needle to the Check data connection position.  This lets the user know something is wrong with the GDT or the data connection.   Check your wireless network connection and make sure your GDT has access to the Internet.
- Renew subscription. Each GDT requires a support subscription if this subscription has not been renewed, the GDT will move the needle to the Renew subscription position and stop displaying the gauge value.  Renew this GDT’s subscription or move the gauge to a GDT that has an active subscription and install this gauge app.

## Data Source

The data for this gauge are from the [WeatherFlow Smart Weather API](https://weatherflow.github.io/SmartWeather/api/#object-model). You must have a Tempest weather station and create a [WeatherFlow Personal Use Token](https://tempestwx.com/settings/tokens) to access your station’s cloud data with this WallGauge.  The [Smart Weather API Remote Data Access Policy](https://weatherflow.github.io/SmartWeather/api/remote-developer-policy.html) gives an overview of the access required for a station owner to access their own data.  

See [How to get a tempest personal use token](https://wallgauge-gaugeapps.github.io/TempestForecastGauge/docs/help.html)

## Security

This gauge requires a WeatherFlow Personal Use Token (API Key) to access your Tempest cloud data.  The WeatherFlow Personal Use Token is encrypted and stored on your GDT.  We do not keep a copy of it in the cloud.  It is only used to access your Tempest weather data.  However, if your GDT is physically stolen or compromised your WeatherFlow Personal Use Token may be accessible.  To revoke a Personal Use Token, connect to the [TempestWx.com web site](https://tempestwx.com/settings/tokens) and delete it.  You can create a new one at any time.
