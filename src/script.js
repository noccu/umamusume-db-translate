// Put SQL and Database as global variable
let SQL;
let db;

// fetchTranslationJSON returns json containing translation data
// append timestamp to get fresh copy since github pages caching is aggressive
const fetchTranslationJSON = async (file) => {
  const timestamp = new Date().getTime();
  const body = await fetch(`${file}?${timestamp}`);
  return await body.json();
}

const fetchConfigJSON = async () => {
  const timestamp = new Date().getTime();
  const body = await fetch(`cfg.json?${timestamp}`);
  return await body.json();
}

// actuallyInitSqlJs loads wasm files and initializes sql.js
const actuallyInitSqlJs = async () => {
  SQL = await initSqlJs({
    locateFile: file => `${window.sql_wasm_path}/${file}`,
  });
};

// savedb exports the db as a downloadable file to the user
const savedb = db => {
  const downloadURL = (data, fileName) => {
    const a = document.createElement('a')
    a.href = data
    a.download = fileName
    document.body.appendChild(a)
    a.style.display = 'none'
    a.click()
    a.remove()
  }
  const downloadBlob = (data, fileName, mimeType) => {
    const blob = new Blob([data], {
      type: mimeType
    })
    const url = window.URL.createObjectURL(blob)
    downloadURL(url, fileName)
    setTimeout(() => window.URL.revokeObjectURL(url), 1000)
  }

  const data = db.export();
  downloadBlob(data, "master.mdb", "application/x-sqlite3");
};

// process translates the loaded db and exports it
const process = async (db, {table, field, file}) => {
  const findAndReplaceStatement = db.prepare(`UPDATE ${table} SET ${field}=:replace WHERE ${field}=:search`);
  const data = await fetchTranslationJSON(file);

  // Search and replace for every item in data.json
  for (const jpText in data) {
    const enText = data[jpText];
    if (!enText) continue; // Skip if enText is empty

    console.log(`Replacing ${jpText} with ${enText}!`);
    findAndReplaceStatement.run({
      ":search":  jpText,
      ":replace": enText,
    });
  }
};

const translate = async (db) => {
  const cfg = await fetchConfigJSON();

  for (let entry of cfg) {
    await process(db, entry);
  }

  // Serve back to user
  savedb(db);
};

// listenFileChange loads picked file as sqlite database
// and fires process() with the loaded db
const listenFileChange = () => {
  const dbFileEl = document.getElementById("dbfile");
  dbFileEl.addEventListener("change", async () => {
    readFile(dbFileEl.files[0]);
  });

  dbFileEl.parentElement.addEventListener("dragover", e => e.preventDefault());
  dbFileEl.parentElement.addEventListener("drop", e => {
    e.preventDefault();
    readFile(e.dataTransfer.files[0]);
  });
}

async function readFile(file) {
  if (!file) return;
  const reader = new FileReader();

  reader.addEventListener("load", () => {
    let uints = new Uint8Array(reader.result);
    db = new SQL.Database(uints);
    translate(db);
  });
  reader.readAsArrayBuffer(file);
}

// We need an async main because javascript
const main = async () => {
  await actuallyInitSqlJs();
  listenFileChange();
}

main();
