const AppMan = require('app-manager');

class myAppManager extends AppMan {
    bleMyConfig() {
        console.log('Setting up tempest weather gauge specfic characteristics and config.');
        this.apiKey = 'notSet';
        var apiKey = this.bPrl.Characteristic('859082f0-e8b3-423f-8470-9d5465b13746', 'apiKey', ["encrypt-read", "encrypt-write"]);
        apiKey.on('WriteValue', (device, arg1) => {
            console.log(device + ', has set new user apiKey.');
            this.apiKey = arg1.toString('utf8');
            apiKey.setValue(this.apiKey)
            this.saveItem({apiKey:this.apiKey});
            this.emit('apiKey', this.apiKey);
        });

        apiKey.on('ReadValue', (device)=>{
            console.log(device + ' has connected and is reading apiKey');
            apiKey.setValue(this.config.apiKey);
            return (this.config.apiKey);
        });

        apiKey.setValue(this.config.apiKey)
    };
};

module.exports = myAppManager;