#!/usr/bin/env bash

# Prints usage help text
function usage {
  echo "Usage: import-new-mdb.sh <master-mdb-path>"
  echo "  <master-mdb-path> path to new master.mdb file"
}

function import {
  # $1: master-mdb-path
  # $2: csv-file-path
  # $3: table
  # $4: text field
  echo "==> Importing table $3 to $2…"

  TEMP_FILE=$(mktemp)
  TEMP_FILE_2=$(mktemp)
  QUERY="SELECT DISTINCT $4 FROM $3"

  sqlite3 "$1" "$QUERY" > "$TEMP_FILE"
  # Check if translated file exists, write new if not
  if [ -f $2 ]; then
    ./scripts/merge-csv.sh "$TEMP_FILE" "$2" > "$TEMP_FILE_2"
    mv "$TEMP_FILE_2" "$2"
  else
    awk 'BEGIN { print "\"text\",\"translation\"" }{ print "\""$0"\",\"\"" }' "$TEMP_FILE" > "$2"
    #rm "$TEMP_FILE_2"
  fi
  rm "$TEMP_FILE"
}

# Not enough args
if [[ "$1" = "" ]]; then
  echo "import-new-mdb.sh – helper script to import new entries found in master.mdb"
  echo
  usage
  exit
fi

# Run series of imports
import "$1" "./src/data/race_coverage/race_jikkyo_comment.csv" "race_jikkyo_comment" "message"
import "$1" "./src/data/race_coverage/race_jikkyo_message.csv" "race_jikkyo_message" "message"
