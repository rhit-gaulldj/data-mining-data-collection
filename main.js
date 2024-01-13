const fs = require('node:fs');
const node_fetch = require('node-fetch');

const INTERVAL = 10_000;

outputBanksTracked('banks.csv');

async function fetch(path) {
    const response = await node_fetch(path);
    const data = await response.json();
    return data;
}

async function getTotalCount(path) { // returns number
    const response = await fetch(`https://banks.data.fdic.gov/api/${path}`);

    return response.meta.total;
}

async function getColsString(path) { // returns string
    const response = await fetch(`https://banks.data.fdic.gov/api/${path}`);
    const cols = Object.keys(response.data[0].data);
    let colString = '';
    for (let i = 0; i < cols.length; i++) {
        colString += cols[i] + ',';
    }
    // Remove last comma and add newline
    colString = colString.substring(0, colString.length - 1) + '\n';
    return colString;
}

async function outputBanksTracked(csvPath) {
    const totalBanks = await getTotalCount('institutions');
    let banksSoFar = 0;
    let offset = 0;
    
    //const response = await fetch(`https://banks.data.fdic.gov/api/institutions?limit=10000&offset=${offset}`);
    // console.log(Object.keys(response.data[0].data));
    // console.log(response.data[0].score);

    // Add the columns
    const colsString = await getColsString('institutions');
    fs.appendFileSync(csvPath, colsString);

    while (banksSoFar < totalBanks) {
        const response = await fetch(`https://banks.data.fdic.gov/api/institutions?limit=${INTERVAL}&offset=${offset}`);
        const data = response.data;
        // Write the data we've read in to the CSV
        for (let i = 0; i < data.length; i++) {
            const d = data[i].data;
            let str = '';
            for (let key in d) {
                str += d[key] + ',';
            }
            // Remove last comma and add newline
            str = str.substring(0, str.length - 1) + '\n';
            fs.appendFileSync(csvPath, str);
        }
        banksSoFar += data.length;
        offset += data.length;
        console.log(`Done with ${banksSoFar}/${totalBanks} banks`);
    }
}