let EditorTeksta = function (divRef) {

    if (!divRef || !(divRef instanceof HTMLElement)) {
        throw new Error("Pogresan tip elementa!");
    }

    if (divRef.tagName.toLowerCase() !== "div") {
        throw new Error("Pogresan tip elementa!");
    }

    if (!divRef.hasAttribute("contenteditable") ||
        divRef.getAttribute("contenteditable") !== "true") {
        throw new Error("Neispravan DIV, ne posjeduje contenteditable atribut!");
    }

    function getLines() {
        let output = "";
        let node = divRef.firstChild;
        function process(node) {
            if (!node) return;

            if (node.nodeType === Node.TEXT_NODE) {
                output += node.nodeValue;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName.toLowerCase() === "br") {
                    output += "\n";
                } else {
                    for (let i = 0; i < node.childNodes.length; i++) {
                        process(node.childNodes[i]);
                    }
                    let display = window.getComputedStyle(node).display;
                    if (display === "block") output += "\n";
                }
            }
        }
        while (node) {
            process(node);
            node = node.nextSibling;
        }
        output = output.replace(/\r\n/g, "\n");
        return output.split("\n");
    }

    function isAllCapsLine(line) {
        let t = line.trim();
        if (!t) return false;
        if (!/^[A-ZĆČŽŠĐ\s]+$/.test(t)) return false;
        return /[A-ZĆČŽŠĐ]/.test(t);
    }

function isSceneTitle(line) {
        if (!line) return false;
        line = line.trim();

        if (!/^[A-Z0-9 .-]+$/.test(line)) return false;

        return /^(INT.|EXT.)\s+.*-\s+(DAY|NIGHT|AFTERNOON|MORNING|EVENING)$/.test(line);
    }


    function isParentheticalLine(line) {
        let t = line.trim();
        if (!t) return false;
        return /^\(.*\)$/.test(t);
    }

    function isPotentialRoleLine(line) {
        let t = line.trim();
        if (!t) return false;
        if (!isAllCapsLine(t)) return false;
        return /^[A-ZĆČŽŠĐ\s]+$/.test(t);
    }


    function parseStructure() {
        let lines = getLines();
        let n = lines.length;

        let lineType = new Array(n).fill("unknown");
        let sceneIndexForLine = new Array(n).fill(0);
        let sceneTitles = [""]; 
        let currentSceneIndex = 0;
        for (let i = 0; i < n; i++) {
            let l = lines[i];

            if (!l.trim()) lineType[i] = "empty";

            if (isSceneTitle(l)) {
                lineType[i] = "scene";
                let title = l.trim();

                if (sceneTitles[currentSceneIndex] === "") {
                    sceneTitles[currentSceneIndex] = title;
                } else {
                    currentSceneIndex++;
                    sceneTitles[currentSceneIndex] = title;
                }
            }

            sceneIndexForLine[i] = currentSceneIndex;
        }
        if (sceneTitles[0] === "" && sceneTitles.length > 1) {
            sceneTitles[0] = sceneTitles[1];
        }
        let blocks = [];
        let roleCounts = {};

        for (let i = 0; i < n; i++) {
            if (lineType[i] === "scene") continue;

            let line = lines[i];

            if (isPotentialRoleLine(line)) {
                let hasSpeech = false;
                let j = i + 1;

                while (j < n) {
                    let l = lines[j];
                    let t = l.trim();
                    if (!t) { j++; continue; } 
                    if (isParentheticalLine(l)) { j++; continue; }
                    if (isSceneTitle(l)) break;
                    if (isPotentialRoleLine(l)) break;

                    hasSpeech = true;
                    break;
                }

                if (!hasSpeech) continue; 
                lineType[i] = "role";
                let roleName = line.trim();
                roleCounts[roleName] = (roleCounts[roleName] || 0) + 1;
                let speechLineIndexes = [];
                let k = i + 1;

                while (k < n) {
                    let l = lines[k];
                    let t = l.trim();
                    if (!t) break;
                    if (isSceneTitle(l)) break;
                    if (isPotentialRoleLine(l) && !isParentheticalLine(l)) break;

                    if (isParentheticalLine(l)) {
                        lineType[k] = "paren";
                    } else {
                        lineType[k] = "speech";
                        speechLineIndexes.push(k);
                    }
                    k++;
                }

                if (speechLineIndexes.length > 0) {
                    let sceneIdx = sceneIndexForLine[i];
                    let textLines = speechLineIndexes.map(ii => lines[ii]);

                    blocks.push({
                        role: roleName,
                        sceneIndex: sceneIdx,
                        sceneTitle: sceneTitles[sceneIdx] || "",
                        roleLine: i,
                        speechLines: speechLineIndexes.slice(),
                        startLine: speechLineIndexes[0],
                        endLine: speechLineIndexes[speechLineIndexes.length - 1],
                        textLines: textLines
                    });
                }

                i = k - 1;
                continue;
            }
        }


        for (let i = 0; i < n; i++) {
            if (lineType[i] === "unknown" && lines[i].trim()) {
                lineType[i] = "action";
            }
        }

        let scenes = [];
        let maxSceneIdx = sceneTitles.length - 1;

        for (let s = 0; s <= maxSceneIdx; s++) {
            scenes[s] = {
                index: s,
                title: sceneTitles[s] || "",
                blocks: [],
                segments: []
            };
        }

        blocks.forEach(b => {
            scenes[b.sceneIndex].blocks.push(b);
        });

        scenes.forEach(scene => {
            scene.blocks.sort((a, b) => a.startLine - b.startLine);

            let segments = [];
            let currentSegment = null;
            let previousBlock = null;
            let segmentCounter = 0;
            let replicaCounter = 0;

            scene.blocks.forEach(block => {
                replicaCounter++;

                let startNew = false;

                if (!previousBlock) {
                    startNew = true;
                } else {
                    let from = previousBlock.endLine + 1;
                    let to = block.roleLine - 1;

                    for (let i = from; i <= to; i++) {
                        if (lineType[i] === "action" || lineType[i] === "scene") {
                            startNew = true;
                            break;
                        }
                    }
                }

                if (startNew) {
                    segmentCounter++;
                    currentSegment = { index: segmentCounter, blocks: [] };
                    segments.push(currentSegment);
                }

                block.indexInScene = replicaCounter;
                block.segmentIndex = currentSegment.index;
                block.indexInSegment = currentSegment.blocks.length + 1;
                currentSegment.blocks.push(block);

                previousBlock = block;
            });

            scene.segments = segments;
        });

        return {
            lines: lines,
            lineType: lineType,
            scenes: scenes,
            blocks: blocks,
            roleCounts: roleCounts
        };
    }

    let dajBrojRijeci = function () {
        let ukupno = 0;
        let boldiranih = 0;
        let italic = 0;

        function traverse(node, boldActive, italicActive) {
            if (node.nodeType === Node.TEXT_NODE) {
                let text = node.nodeValue || "";

                let regex = /[A-Za-zĆČŽŠĐÀ-ž0-9][A-Za-zĆČŽŠĐÀ-ž0-9'-]*/g;
                let match;

                while ((match = regex.exec(text)) !== null) {
                    let token = match[0];
                    if (!/[A-Za-zĆČŽŠĐÀ-ž]/.test(token)) continue;
                    ukupno++;
                    if (boldActive) boldiranih++;
                    if (italicActive) italic++;
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                let tag = node.tagName.toLowerCase();
                let newBold = boldActive;
                let newItalic = italicActive;

                if (tag === "b" || tag === "strong") newBold = true;
                if (tag === "i" || tag === "em") newItalic = true;

                for (let i = 0; i < node.childNodes.length; i++) {
                    traverse(node.childNodes[i], newBold, newItalic);
                }
            }
        }

        traverse(divRef, false, false);

        return {
            ukupno: ukupno,
            boldiranih: boldiranih,
            italic: italic
        };
    };

    let dajUloge = function () {
        let structure = parseStructure();
        let blocks = structure.blocks;

        let seen = {};
        let roles = [];

        blocks.forEach(b => {
            if (!seen[b.role]) {
                seen[b.role] = true;
                roles.push(b.role);
            }
        });

        return roles;
    };


    function levenshtein(a, b) {
        let m = a.length, n = b.length;
        let dp = Array(m + 1);

        for (let i = 0; i <= m; i++) {
            dp[i] = Array(n + 1);
            dp[i][0] = i;
        }
        for (let j = 0; j <= n; j++) {
            dp[0][j] = j;
        }

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                let cost = a[i - 1] === b[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + cost
                );
            }
        }
        return dp[m][n];
    }

    let pogresnaUloga = function () {
        let s = parseStructure();
        let counts = s.roleCounts;

        let names = Object.keys(counts);
        let wrong = new Set();

        for (let i = 0; i < names.length; i++) {
            for (let j = 0; j < names.length; j++) {
                if (i === j) continue;

                let A = names[i], B = names[j];
                let lenA = A.length, lenB = B.length;

                let dist = levenshtein(A, B);
                let similar =
                    (lenA > 5 && lenB > 5 && dist <= 2) ||
                    ((lenA <= 5 || lenB <= 5) && dist <= 1);

                if (!similar) continue;

                let countA = counts[A], countB = counts[B];

                if (countB >= 4 && countB >= countA + 3) {
                    wrong.add(A);
                }
            }
        }

        return Array.from(wrong);
    };

    let brojLinijaTeksta = function (uloga) {
        if (!uloga) return 0;
        let target = uloga.toUpperCase().trim();
        if (!target) return 0;

        let s = parseStructure();
        let blocks = s.blocks;

        let sum = 0;
        blocks.forEach(b => {
            if (b.role === target) {
                sum += b.speechLines.length;
            }
        });

        return sum;
    };

    let scenarijUloge = function (uloga) {
        if (!uloga) return [];
        let target = uloga.toUpperCase().trim();
        if (!target) return [];

        let s = parseStructure();
        let scenes = s.scenes;
        let result = [];

        scenes.forEach(scene => {
            scene.segments.forEach(segment => {
                let blocks = segment.blocks;

                for (let i = 0; i < blocks.length; i++) {
                    let b = blocks[i];
                    if (b.role !== target) continue;

                    let prev = null, next = null;

                    if (i > 0) {
                        let pb = blocks[i - 1];
                        prev = {
                            uloga: pb.role,
                            linije: pb.textLines.join("\n")
                        };
                    }

                    if (i < blocks.length - 1) {
                        let nb = blocks[i + 1];
                        next = {
                            uloga: nb.role,
                            linije: nb.textLines.join("\n")
                        };
                    }

                    result.push({
                        scena: scene.title,
                        pozicijaUTekstu: b.indexInScene,
                        prethodni: prev,
                        trenutni: {
                            uloga: b.role,
                            linije: b.textLines.join("\n")
                        },
                        sljedeci: next
                    });
                }
            });
        });

        return result;
    };

    let grupisiUloge = function () {
        let s = parseStructure();
        let scenes = s.scenes;

        let result = [];

        scenes.forEach(scene => {
            scene.segments.forEach(segment => {
                let blocks = segment.blocks;
                if (blocks.length === 0) return;

                let seen = {};
                let arr = [];

                blocks.forEach(b => {
                    if (!seen[b.role]) {
                        seen[b.role] = true;
                        arr.push(b.role);
                    }
                });

                result.push({
                    scena: scene.title,
                    segment: segment.index,
                    uloge: arr
                });
            });
        });

        return result;
    };

    let formatirajTekst = function (komanda) {
        if (!["bold", "italic", "underline"].includes(komanda)) {
            return false;
        }

        let sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return false;

        let range = sel.getRangeAt(0);
        if (range.collapsed) return false;

        let sc = range.startContainer;
        let ec = range.endContainer;

        if (!divRef.contains(sc) || !divRef.contains(ec)) {
            return false;
        }

        divRef.focus();
        document.execCommand(komanda, false, null);

        return true;
    };
    return {
        dajBrojRijeci: dajBrojRijeci,
        dajUloge: dajUloge,
        pogresnaUloga: pogresnaUloga,
        brojLinijaTeksta: brojLinijaTeksta,
        scenarijUloge: scenarijUloge,
        grupisiUloge: grupisiUloge,
        formatirajTekst: formatirajTekst
    };
};

window.EditorTeksta = EditorTeksta;
