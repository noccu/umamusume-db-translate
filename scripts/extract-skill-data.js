//Node 17.0.1
import sqlite3 from "better-sqlite3";
import fs from "fs";
import { join as pathJoin } from "path";

const DB_PATH = process.argv[2] || pathJoin(process.env.LOCALAPPDATA, "../LocalLow/Cygames/umamusume/master/master.mdb");
const DATA_TL_PATH = "scripts/data/skillData.json"
// H-haha harold.jpg
const SQL_STMT = `select text, float_ability_time_1, condition_1, ability_type_1_1, float_ability_value_1_1, target_type_1_1, target_value_1_1,
ability_type_1_2, float_ability_value_1_2, target_type_1_2, target_value_1_2,
ability_type_1_3, float_ability_value_1_3, target_type_1_3, target_value_1_3,
float_ability_time_2, condition_2, ability_type_2_1, float_ability_value_2_1, target_type_2_1, target_value_2_1,
ability_type_2_2, float_ability_value_2_2, target_type_2_2, target_value_2_2,
ability_type_2_3, float_ability_value_2_3, target_type_2_3, target_value_2_3
                            from text_data
                            inner join skill_data on text_data."index" = skill_data.id
                            where text_data.category = 48;`;
const DATA_TL = JSON.parse(fs.readFileSync(DATA_TL_PATH, "utf-8"));

(function main() {
    let jsonOut = {};
    const db = sqlite3(DB_PATH);
    const stmt = db.prepare(SQL_STMT).raw(true);
    let res = stmt.all();
    db.close();
    res.forEach(row => {
        let [skill, ...data] = row;
        jsonOut[skill] = `<size=20>${translateData(data)}\\n</size>`;
    });
    fs.writeFileSync("src/data/alt/skill-desc.json", JSON.stringify(jsonOut, null, 2));
})();

function translateData(sqlData) {
    //harold.png
    let [duration, conditions,
        type, strength, targetType, targetValue,
        type2, strength2, targetType2, targetValue2,
        type3, strength3, targetType3, targetValue3,
        ...skill2] = sqlData;

    let outString = translateEffect(type, strength);
    if (targetType > 1) outString += translateTarget(targetType, targetValue);

    if (type2) outString += `, ${translateEffect(type2, strength2)}`;
    if (targetType2 > 1) outString += translateTarget(targetType2, targetValue2);

    if (type3) outString += `, ${translateEffect(type3, strength3)}`;
    if (targetType3 > 1) outString += translateTarget(targetType3, targetValue3);

    if (duration == -1) { duration = "indefinitely"; }
    else if (duration == 0) { duration = "immediately"; }
    else { duration = "for " + parseInt(duration) / 10000 + "s"; }
    outString += ` ${duration}`;

    outString += ` when: ${translateConditions(conditions)}`;

    if (skill2.length && skill2[2] != 0) { outString += "\\n" + translateData(skill2) }
    return outString;
}
function translateEffect(type, strength) {
    let effect = DATA_TL.ability_type[type];
    strength = strength / 10000;

    //todo: find something better, if needed...
    if (Array.isArray(effect)) {
        strength = transformValue(strength, effect[1]);
        effect = effect[0];        
    }

    // Percentage tresh arbitrarily chosen
    strength = strength.toLocaleString(undefined, {style: (Math.abs(strength) < 3) ? "percent" : "decimal", signDisplay:"exceptZero", useGrouping: false});
    
    return `${effect} ${strength}`;
}

function transformValue(val, transforms) {
    transforms.split(" ").forEach(f => {
        let m = f.match(/(\d+)-/)
        if (m) val = m[1] - val
        else if (f == "inv") val *= -1
        else if (f == "%") val /= 100
    })
    return val
}

function translateTarget(type, value) {
    if (type == 0 || type == 1) return "";
    type = DATA_TL.target_type[type];
    let val = DATA_TL.target_value[value];
    return ` to ${val || `${value} closest`} ${type}`;
}
function translateConditions(conditions) {
    let orSplit = conditions.split("@");
    orSplit.forEach((expr, idx) => {
        let andSplit = expr.split("&");
        andSplit.forEach((cond, idx) => {
            let [, name, op, val] = cond.match(/([a-z_]+)([=!<>]+)(\d+)/);
            let condData = DATA_TL.conditions[name];
            if (!condData) {
                andSplit[idx] = `${name} ${op} ${val}`; //better text flow in game at the cost of some readability
                return;
            }
            let text = condData.string || condData[op];
            if (!text) return; //just in case
            if (Array.isArray(text)) {
                val = transformValue(val, text[1]);
                text = text[0];
            }
            andSplit[idx] = text.replace("$", () => {
                return condData.lookup?.[val] || val;
            });
        });
        orSplit[idx] = andSplit.join(" AND ");
    });

    conditions = orSplit.join(" OR ");
    return conditions;
}