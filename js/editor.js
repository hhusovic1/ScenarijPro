window.addEventListener("DOMContentLoaded", function () {
    var editorDiv = document.getElementById("divEditor");
    if (!editorDiv) return;

    var editor = EditorTeksta(editorDiv);
    var porukeDiv = document.getElementById("poruke");

    function setMessage(msg) {
        if (!porukeDiv) return;
        porukeDiv.textContent = "";
        porukeDiv.textContent = msg;
    }

    function pretty(obj) {
        return JSON.stringify(obj, null, 2);
    }

    function getCurrentUserId() {
        var el = document.getElementById("userIdInput");
        return parseInt(el ? el.value : "1") || 1;
    }

    function getCurrentScenarioId() {
        var el = document.getElementById("scenarioIdInput");
        return parseInt(el ? el.value : "1") || 1;
    }

    function updateSceneList() {
        var ul = document.querySelector(".scenes-list");
        if (!ul) return;

        var content = editorDiv.innerText;
        var lines = content.split("\n");
        var scenes = [];

        lines.forEach((line) => {
            var trim = line.trim();
            if (/^(INT\.|EXT\.)/i.test(trim)) scenes.push(trim);
        });

        ul.innerHTML = "";

        var header = document.querySelector(".sidebar-header");
        if (header) header.textContent = `Scenes (${scenes.length})`;

        if (scenes.length === 0) {
            ul.innerHTML = '<li class="scene-item"><div class="scene-title">No scenes detected</div></li>';
        } else {
            scenes.forEach((sceneName, idx) => {
                var li = document.createElement("li");
                li.className = "scene-item";
                li.classList.toggle("active", idx === 0);
                li.innerHTML = `
                    <div class="scene-title">${idx + 1}. ${sceneName}</div>
                    <div class="scene-pages"></div>
                `;
                ul.appendChild(li);
            });
        }
    }

    function loadScenario() {
        var scenarioId = getCurrentScenarioId();
        setMessage("Loading...");

        PoziviAjax.getScenario(scenarioId, function (status, data) {
            if (status === 200) {
                var titleEl = document.getElementById("scenarioTitle");
                if (titleEl) titleEl.textContent = data.title || "Loaded";

                var linesArray = data.content || data.lines || [];
                var fullText = linesArray.map((l) => l.text).join("\n");

                editorDiv.innerText = fullText;
                setMessage("Loaded: " + (data.title || ""));
                updateSceneList();
            } else if (status === 404) {
                setMessage("Scenario not found.");
                editorDiv.innerText = "";
                updateSceneList();
            } else {
                setMessage("Error loading: " + status);
            }
        });
    }

    function saveToServer() {
        var content = editorDiv.innerText;
        setMessage("Saving...");

        var scenarioId = getCurrentScenarioId();
        var userId = getCurrentUserId();

        PoziviAjax.lockLine(scenarioId, 1, userId, function (lockStatus, lockData) {
            if (lockStatus === 200 || lockStatus === 409) {
                PoziviAjax.updateLine(scenarioId, 1, userId, content, function (status, data) {
                    if (status === 200) {
                        setMessage("Saved at " + new Date().toLocaleTimeString());
                        updateSceneList();
                    } else {
                        setMessage("Save failed: " + status + " (" + (data.message || "") + ")");
                    }
                });
            } else {
                setMessage("Lock failed: " + lockStatus + " (" + (lockData.message || "") + ")");
            }
        });
    }

    document.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
            e.preventDefault();
            saveToServer();
        }
    });

    var urlParams = new URLSearchParams(window.location.search);
    var idFromUrl = parseInt(urlParams.get("id") || "");
    if (!Number.isNaN(idFromUrl) && document.getElementById("scenarioIdInput")) {
        document.getElementById("scenarioIdInput").value = idFromUrl;
    }

    loadScenario();

    var btnUcitaj = document.getElementById("btnUcitaj");
    if (btnUcitaj) btnUcitaj.addEventListener("click", loadScenario);

    var btnKreiraj = document.getElementById("btnKreiraj");
    if (btnKreiraj) {
        btnKreiraj.addEventListener("click", function () {
            var titleEl = document.getElementById("newScenarioTitle");
            var title = (titleEl ? titleEl.value : "").trim();
            if (!title) {
                setMessage("Unesite naziv scenarija.");
                return;
            }

            setMessage("Kreiram scenarij...");
            PoziviAjax.postScenario(title, function (status, data) {
                if (status === 200) {
                    var scenarioIdInput = document.getElementById("scenarioIdInput");
                    if (scenarioIdInput && data && data.id != null) scenarioIdInput.value = data.id;
                    var scenarioTitle = document.getElementById("scenarioTitle");
                    if (scenarioTitle) scenarioTitle.textContent = data.title || title;
                    loadScenario();
                } else {
                    setMessage("Greška pri kreiranju: " + status);
                }
            });
        });
    }

    var btnBrojRijeci = document.getElementById("btnBrojRijeci");
    if (btnBrojRijeci) {
        btnBrojRijeci.addEventListener("click", function () {
            var res = editor.dajBrojRijeci();
            setMessage("Broj riječi: " + res.ukupno + ", boldiranih: " + res.boldiranih + ", italic: " + res.italic);
        });
    }

    var btnUloge = document.getElementById("btnUloge");
    if (btnUloge) {
        btnUloge.addEventListener("click", function () {
            var res = editor.dajUloge();
            setMessage("Uloge: " + res.join(", "));
        });
    }

    var btnPogresne = document.getElementById("btnPogresneUloge");
    if (btnPogresne) {
        btnPogresne.addEventListener("click", function () {
            var res = editor.pogresnaUloga();
            setMessage("Potencijalno pogrešne uloge: " + (res.length ? res.join(", ") : "nema"));
        });
    }

    var ulogaInput = document.getElementById("ulogaInput");

    var btnBrojLinija = document.getElementById("btnBrojLinija");
    if (btnBrojLinija) {
        btnBrojLinija.addEventListener("click", function () {
            var name = ulogaInput ? ulogaInput.value : "";
            var count = editor.brojLinijaTeksta(name);
            setMessage('Ukupan broj linija koje uloga "' + name + '" izgovara: ' + count);
        });
    }

    var btnScenarijUloge = document.getElementById("btnScenarijUloge");
    if (btnScenarijUloge) {
        btnScenarijUloge.addEventListener("click", function () {
            var name = ulogaInput ? ulogaInput.value : "";
            var res = editor.scenarijUloge(name);
            setMessage("Scenarij uloge:\n" + pretty(res));
        });
    }

    var btnGrupisi = document.getElementById("btnGrupisiUloge");
    if (btnGrupisi) {
        btnGrupisi.addEventListener("click", function () {
            var res = editor.grupisiUloge();
            setMessage("Grupisane uloge po scenama i segmentima:\n" + pretty(res));
        });
    }

    var btnBold = document.getElementById("btnBold");
    if (btnBold) {
        btnBold.addEventListener("click", function () {
            var ok = editor.formatirajTekst("bold");
            if (!ok) setMessage("Nije odabran tekst ili selekcija nije u editoru.");
        });
    }

    var btnItalic = document.getElementById("btnItalic");
    if (btnItalic) {
        btnItalic.addEventListener("click", function () {
            var ok = editor.formatirajTekst("italic");
            if (!ok) setMessage("Nije odabran tekst ili selekcija nije u editoru.");
        });
    }

    var btnUnderline = document.getElementById("btnUnderline");
    if (btnUnderline) {
        btnUnderline.addEventListener("click", function () {
            var ok = editor.formatirajTekst("underline");
            if (!ok) setMessage("Nije odabran tekst ili selekcija nije u editoru.");
        });
    }

    var btnLockLine = document.getElementById("btnLockLine");
    if (btnLockLine) {
        btnLockLine.addEventListener("click", function () {
            var lineIdEl = document.getElementById("lockLineId");
            var lineId = parseInt(lineIdEl ? lineIdEl.value : "");

            if (Number.isNaN(lineId)) {
                setMessage("Unesite ispravan ID linije.");
                return;
            }

            var scenarioId = getCurrentScenarioId();
            var userId = getCurrentUserId();

            setMessage("Zaključavam liniju " + lineId + "...");
            PoziviAjax.lockLine(scenarioId, lineId, userId, function (status, data) {
                if (status === 200) {
                    setMessage("Linija " + lineId + " uspješno zaključana!");
                } else if (status === 409) {
                    setMessage("Linija " + lineId + " je već zaključana.");
                } else {
                    setMessage("Greška: " + (data.message || status));
                }
            });
        });
    }

    var btnUpdateLine = document.getElementById("btnUpdateLine");
    if (btnUpdateLine) {
        btnUpdateLine.addEventListener("click", function () {
            var lineIdEl = document.getElementById("updateLineId");
            var textEl = document.getElementById("updateLineText");
            var lineId = parseInt(lineIdEl ? lineIdEl.value : "");
            var newText = textEl ? textEl.value.trim() : "";

            if (Number.isNaN(lineId) || !newText) {
                setMessage("Unesite ID linije i novi tekst.");
                return;
            }

            var scenarioId = getCurrentScenarioId();
            var userId = getCurrentUserId();

            setMessage("Ažuriram liniju " + lineId + "...");
            PoziviAjax.updateLine(scenarioId, lineId, userId, newText, function (status, data) {
                if (status === 200) {
                    setMessage("Linija " + lineId + " uspješno ažurirana!");
                    loadScenario();
                } else {
                    setMessage("Greška: " + (data.message || status));
                }
            });
        });
    }

    var btnLockChar = document.getElementById("btnLockChar");
    if (btnLockChar) {
        btnLockChar.addEventListener("click", function () {
            var charNameEl = document.getElementById("lockCharName");
            var charName = (charNameEl ? charNameEl.value : "").trim();
            if (!charName) {
                setMessage("Unesite ime lika za zaključavanje.");
                return;
            }

            var scenarioId = getCurrentScenarioId();
            var userId = getCurrentUserId();

            setMessage("Zaključavam lika: " + charName + "...");
            PoziviAjax.lockCharacter(scenarioId, charName, userId, function (status, data) {
                if (status === 200) {
                    setMessage("Lik " + charName + " uspješno zaključan!");
                } else {
                    setMessage("Greška: " + (data.message || status));
                }
            });
        });
    }

    var btnUpdateChar = document.getElementById("btnUpdateChar");
    if (btnUpdateChar) {
        btnUpdateChar.addEventListener("click", function () {
            var oldNameEl = document.getElementById("lockCharName");
            var newNameEl = document.getElementById("newCharName");
            var oldName = (oldNameEl ? oldNameEl.value : "").trim();
            var newName = (newNameEl ? newNameEl.value : "").trim();

            if (!oldName || !newName) {
                setMessage("Morate unijeti staro ime (lijevo) i novo ime (desno).");
                return;
            }

            var scenarioId = getCurrentScenarioId();
            var userId = getCurrentUserId();

            setMessage("Mijenjam ime " + oldName + " -> " + newName + "...");
            PoziviAjax.updateCharacter(scenarioId, userId, oldName, newName, function (status, data) {
                if (status === 200) {
                    setMessage("Ime uspješno promijenjeno!");
                    loadScenario();
                } else {
                    setMessage("Greška pri izmjeni: " + (data.message || status));
                }
            });
        });
    }

    var btnGetDeltas = document.getElementById("btnGetDeltas");
    if (btnGetDeltas) {
        btnGetDeltas.addEventListener("click", function () {
            var scenarioId = getCurrentScenarioId();

            setMessage("Provjeravam promjene na serveru...");
            PoziviAjax.getDeltas(scenarioId, 0, function (status, data) {
                if (status === 200) {
                    var changes = data.deltas || [];
                    var statusSpan = document.getElementById("deltasStatus");
                    if (statusSpan) statusSpan.textContent = "Broj zapisa: " + changes.length;
                    setMessage("Dohvaćeno " + changes.length + " promjena sa servera.");
                    console.log("Sve promjene:", changes);
                } else {
                    setMessage("Greška pri dohvatanju promjena.");
                }
            });
        });
    }
});
