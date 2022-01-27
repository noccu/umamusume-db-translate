import csvParser from "csv-parse/lib/sync.js"
import csvStringify from "csv-stringify/lib/sync.js"
import fs from "fs"

//* This script translates factor-desc.csv using data from skill-name.csv
//* Run this file from root dir or specify all files as arguments
var FILES = {
        factors: process.argv[2] || "./src/data/factor-desc.csv",
        skills: process.argv[3] || "./src/data/skill-name.csv",
        common: process.argv[3] || "./src/data/common.csv"
    }

function readFiles() {
    let currentFile;
    let parsedFiles = {}

    function parseRecords(rec, ctx) {
        currentFile[rec.text] = rec.translation;
        return null;
    }

    for (let file of Object.keys(FILES)) {
        currentFile = {};
        csvParser(fs.readFileSync(FILES[file], "utf8"), { columns: true, escape: undefined, trim: true, skip_empty_lines: true, on_record: parseRecords })
        parsedFiles[file] = currentFile;
    }    
    console.log("Files read.");
    return parsedFiles;
}

function translate(pFiles) {
    for (let [jpText, enText] of Object.entries(pFiles.factors)) {
        let skillName = undefined, commonName = undefined, hasApt = undefined
        if (jpText == "text") continue; //skip header
        let m = jpText.match(/「(.+)」のスキル/)
        if (m) {
            [,skillName] = m
            if (pFiles.skills[skillName]) {
                skillName = pFiles.skills[skillName]; //replace var with EN ver
            }
        }
        m = jpText.match(/(.+?)(適性)?がアップ/)
        if (m) {
            [,commonName, hasApt] = m
            commonName = commonName.split("と")
            commonName.forEach((name, idx) => {
                if (pFiles.common[name]) {
                    commonName[idx] = pFiles.common[name]; //replace var with en ver
                }
            })
            commonName = commonName.join(" and ")
        }
        let fullString = ""
        if (commonName) fullString += `Increases ${commonName}${hasApt ? " aptitude" : ""}`
        if (skillName) fullString += `${commonName? ", g" : "G"}ain skill hint: ${skillName}`
        if (fullString) {
            pFiles.factors[jpText] = `<size=22>${fullString}\\n</size>`; //write full name, whichever parts were found
        }
    }
}

function writeFiles(pFiles) {
    let records = []
    for (let [key, val] of Object.entries(pFiles.factors)) {
        records.push({text: key, translation: val});
    }
    // fs.writeFileSync(FILES[file], csvStringify(records, {escape: "\\", quoted_string: true, header: true}), "utf-8");
    //* since we currently intentionally mangle the header row..
    let outString = `"text", "translation"\n` + csvStringify(records, {escape: undefined, quoted_string: true});
    fs.writeFileSync(FILES.factors, outString, "utf-8");
}

console.log("Reading...");
const res = readFiles();
console.log("Translating...");
translate(res);
console.log("Writing...");
writeFiles(res);
