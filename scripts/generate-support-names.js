import csvParser from "csv-parse/lib/sync.js"
import csvStringify from "csv-stringify/lib/sync.js"
import fs from "fs"

//* This script translates support-full-name.csv and support-effect-unique-name.csv using data from support-title.csv and uma-name.csv
//* Only the latter 2 need to be kept translated.
//* Run this file from root dir or specify all files as arguments
var FILES = {
        titles: process.argv[2] || "./src/data/support-title.csv",
        umaNames: process.argv[3] || "./src/data/uma-name.csv",
        fullNames: process.argv[4] || "./src/data/support-full-name.csv",
        uniqueNames: process.argv[5] || "./src/data/support-effect-unique-name.csv"
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
        csvParser(fs.readFileSync(FILES[file], "utf8"), { columns: true, escape: "\\", trim: true, skip_empty_lines: true, on_record: parseRecords })
        parsedFiles[file] = currentFile;
    }    
    console.log("Files read.");
    return parsedFiles;
}

function translate(pFiles) {
    for (let [jpText, enText] of Object.entries(pFiles.fullNames)) {
        if (jpText == "text") continue; //skip header
        let [,fullTitle, titleName, umaName] = jpText.match(/(\[(.*)\])(.*)/)
        if (pFiles.titles[fullTitle]) {
            fullTitle = pFiles.titles[fullTitle]; //replace var with EN ver
            if (Object.hasOwn(pFiles.uniqueNames, titleName) && !pFiles.uniqueNames[titleName]) {
                pFiles.uniqueNames[titleName] = fullTitle.replace(/\[|\]/g, ""); //write en pure title, using previous var
            }
        }
        if (pFiles.umaNames[umaName]) {
            umaName = pFiles.umaNames[umaName]; //replace var with en ver
        }
        pFiles.fullNames[jpText] = `${fullTitle} ${umaName}`; //write full name, whichever parts were found
    }
}

function writeFiles(pFiles) {
    // Don't change files only used for lookup
    delete pFiles.umaNames;
    delete pFiles.titles;
    for (let [file, content] of Object.entries(pFiles)) {
        let records = []
        for (let [key, val] of Object.entries(content)) {
            records.push({text: key, translation: val});
        }
        // fs.writeFileSync(FILES[file], csvStringify(records, {escape: "\\", quoted_string: true, header: true}), "utf-8");
        //* since we currently intentionally mangle the header row..
        let string = `"text", "translation"\n` + csvStringify(records, {escape: "\\", quoted_string: true});
        fs.writeFileSync(FILES[file], string, "utf-8");
    }
}

console.log("Reading...");
const res = readFiles();
console.log("Translating...");
translate(res);
console.log("Writing...");
writeFiles(res);
