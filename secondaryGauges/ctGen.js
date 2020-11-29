

const rawMin = 17
const rawMax = 615
const resolution = .1
const maxGaugeValue = 9

let x = Math.round((Math.log10(1.1) * (rawMax - rawMin)) + rawMin);

console.log('Generating logarithmic calibration table for the following params:');
console.log('raw minimum value = ' + rawMin);
console.log('rax maximum value = ' + rawMax);
console.log('resolution = ' + resolution);
console.log('Max gauge Value = ' + maxGaugeValue);


let tableString = '"calibrationTable":['

for (i = 1; i <= (maxGaugeValue + 1); i = i + resolution) {
    let x = Math.round((Math.log10(i) * (rawMax - rawMin)) + rawMin);

    let gaugeValue = (Number(i) - 1).toFixed(1)
    // gaugeValue = gaugeValue * 10
    tableString += '[' + gaugeValue + ',' + x + ']'
    if(Number(i).toFixed(1) != 10.0){tableString += ','};
}

tableString += ']'
console.log('\nCut and paste the following into the calibration.json file.\n')
console.log(tableString);
