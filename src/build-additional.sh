for f in src/data/additional/*.csv; do
    jq -sRf src/csvtojson.jq $f > "${f%.csv}.json"
done
