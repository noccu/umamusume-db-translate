import re
import sys
from math import ceil

class Args:
    parsed = dict()

    def getArg(self, name, default=None) -> str:
        try:
            return self.parsed[name]
        except KeyError:
            return default

    def setArg(self, name, val):
        self.parsed[name] = val

    def parse(self):
        args = sys.argv[1:]
        idx = 0
        while idx < len(args):
            name = args[idx]
            if name.startswith("-"):
                try:
                    val = args[idx+1]
                except IndexError:
                    val = ""
                if val and not val.startswith("-"):
                    if val.startswith('"'):
                        while not val.endswith('"'):
                            idx += 1
                            val += args[idx + 1]
                    self.setArg(name, val)
                    idx += 2  # get next opt
                else:
                    self.setArg(name, True)
                    idx += 1
            else: raise SystemExit("Invalid arguments")
        return self

args = Args().parse()
if args.getArg("-h"):
    print("[-t <story|home|race>] [-g <group>] [-id <id>] [-src <json file>] [-ll <line length>]",
                 "At least 1 arg is required.",
                 "-src overwrites other options.")
    raise SystemExit

TARGET_FILE = args.getArg("-src", None)
VERBOSE = args.getArg("-V", False)

LINE_LENGTH = int(args.getArg("-ll", 30)) # Just a random avg
NEWLINES = args.getArg("-nl", False)

if not TARGET_FILE: raise SystemExit("No input file.")

def process(text: str, options: dict):
    if "noNewlines" in options and options['noNewlines']:
        text = cleannewLines(text)
    if "lineLen" in options:
        text = adjustLength(text, options['lineLen'] or LINE_LENGTH, targetLines = (options['targetLines'] if "targetLines" in options else 3))
    if "replace" in options:
        text = replace(text)
    return text

def cleannewLines(text: str):
    return re.sub(r"\\n|\r?\n", " ", text)

def adjustLength(text: str, lineLen: int = 0, numLines: int = 0, targetLines: int = 0):
    if len(text) < lineLen:
        if VERBOSE: print("Short text line, skipping: ", text)
        return text

    if lineLen > 0:
        #check if it's ok already
        lines = text.splitlines()
        tooLong = [line for line in lines if len(line) > lineLen]
        if not tooLong and len(lines) <= targetLines:
            if VERBOSE: print("Text passes length check, skipping: ", text)
            return text

        #adjust if not
        text = cleannewLines(text)
        # python regexes kinda suck
        lines = re.findall(f"(?:(?<= )|(?<=^)).{{1,{lineLen}}}(?= |$)|(?<= ).+$", text)
        nLines = len(lines)
        if nLines > 1 and len(lines[-1]) < min(lineLen, len(text)) / nLines:
            if VERBOSE: print("Last line is short, balancing on line number: ", lines)
            return adjustLength(text, numLines = nLines, targetLines = targetLines)

    elif numLines > 0:
        lineLen = ceil(len(text) / numLines)
        lines = re.findall(f"(?:(?<= )|(?<=^)).{{{lineLen},}}?(?= |$)|(?:(?<= )|(?<=^)).+$", text)

    if targetLines > 0 and len(lines) > targetLines:
        print(f"Exceeded target lines ({targetLines}) in {TARGET_FILE} at: ", lines)
    return "\\n".join(lines)

def replace(text: str):
    raise NotImplementedError
    data = common.readJson("src/data/replacer.json")
    for sub in data:
        text = re.sub(sub['re'], sub['repl'], text)
    return text

def main():
    print(f"Processing {TARGET_FILE}")

    data = ["\"text\", \"translation\"\n"]
    with open(TARGET_FILE, "r+", newline='\n', encoding="utf8") as csvfile:
        for idx, line in enumerate(csvfile):
            # skip header and empty lines
            if idx == 0 or not line: continue
            row = re.match(r"^\"(.+)\", ?\"(.+)\"$", line).groups()
            data.append(f"\"{row[0]}\",\"{process(row[1], {'lineLen': LINE_LENGTH, 'noNewlines': NEWLINES}) if row[1] and not row[0] == 'text' else row[1]}\"\n")

        csvfile.seek(0)
        csvfile.truncate()
        csvfile.writelines(data)


    print("File processed.")

if __name__ == '__main__':
    main()