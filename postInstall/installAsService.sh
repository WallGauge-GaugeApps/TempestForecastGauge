#!/bin/bash
# From DOS prompt type (git update-index --chmod=+x installAsService.sh) to make this file executable.
set -e
echo "NPM post install shell that installs this app as service starts now..."
echo "Set irdclient as defalut group for TempestForecastGauge -> sudo chown :irdclient ../TempestForecastGauge"
sudo chown :irdclient ../TempestForecastGauge
echo "Give default group write access to the TempestForecastGauge directory -> sudo chmod g+w ../TempestForecastGauge"
sudo chmod g+w ../TempestForecastGauge
echo "Install D-Bus config file for this service -> sudo cp ./postInstall/dbus.conf /etc/dbus-1/system.d/TempestForecastGauge.conf"
sudo cp ./postInstall/dbus.conf /etc/dbus-1/system.d/TempestForecastGauge.conf
echo "Install systemd service file -> sudo cp -n ./postInstall/server.service /etc/systemd/system/TempestForecastGauge.service"
sudo cp -n ./postInstall/server.service /etc/systemd/system/TempestForecastGauge.service
echo "Enable the servers to start on reboot -> systemctl enable TempestForecastGauge.service"
sudo systemctl enable TempestForecastGauge.service
echo "Start the service now -> systemctl start TempestForecastGauge.service"
sudo systemctl start TempestForecastGauge.service
echo "NPM Post install shell is complete."
#echo "To start this servers please reboot the server. After reboot Type -> journalctl -u TempestForecastGauge -f <- to see status."