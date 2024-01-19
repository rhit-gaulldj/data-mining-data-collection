const fs = require('node:fs');
const node_fetch = require('node-fetch');
const yaml = require('js-yaml');

const INTERVAL = 10_000;

run();

async function run() {
    await output('banks.csv', 'institutions', 'institution_properties.yaml', 'banks');
    await output('failures.csv', 'failures', 'failure_properties.yaml', 'failures');
    await output('financials.csv', 'financials', 'institution_properties.yaml', 'financials');
}

async function fetch(path) {
    const response = await node_fetch(path);
    const data = await response.json();
    return data;
}

async function getTotalCount(path) { // returns number
    const response = await fetch(`https://banks.data.fdic.gov/api/${path}`);

    return response.meta.total;
}

function loadColYaml(yamlPath) {
    const content = fs.readFileSync(yamlPath, 'utf-8');
    const doc = yaml.load(content);
    return doc;
}

function ifExistsClear(filepath) {
    if (fs.existsSync(filepath)) {
        fs.writeFileSync(filepath, '');
    }
}

async function output(csvPath, apiPath, yamlPath, debugNamePlural) {
    console.log(`===== Starting ${debugNamePlural} =====`);
    ifExistsClear(csvPath);

    const totalItems = await getTotalCount(apiPath);
    let itemsSoFar = 0;
    let offset = 0;

    // Add the columns
    const rawColData = loadColYaml(yamlPath);
    const colData = rawColData.properties.data.properties; // This is an object not an array
    const colKeys = Object.keys(colData);
    const colNames = [];
    let colsString = '';
    for (let key in colData) {
        const name = colData[key].title;
        colNames.push(name);
        colsString += name.replace(',', '') + ',';
    }
    // Remove last comma
    colsString = colsString.substring(0, colsString.length - 1) + '\n';
    fs.appendFileSync(csvPath, colsString);

    while (itemsSoFar < totalItems) {
        const response = await fetch(`https://banks.data.fdic.gov/api/${apiPath}?limit=${INTERVAL}&offset=${offset}`);
        const data = response.data;
        // Write the data we've read in to the CSV
        for (let i = 0; i < data.length; i++) {
            const d = data[i].data;
            let str = '';
            for (let key of colKeys) {
                val = d[key]?.toString() ?? '';
                if (val.indexOf(',') >= 0 || val.indexOf('"') > 0) {
                    // Enclose in quotes, escape quotes as needed
                    val = val.replace(/\"/g, '""');
                    val = '"' + val + '"';
                }
                str += val + ',';
            }
            // Remove last comma and add newline
            str = str.substring(0, str.length - 1) + '\n';
            fs.appendFileSync(csvPath, str);
        }
        itemsSoFar += data.length;
        offset += data.length;
        console.log(`Done with ${itemsSoFar}/${totalItems} ${debugNamePlural}`);
    }
}