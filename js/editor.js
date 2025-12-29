window.addEventListener("DOMContentLoaded", function () {
    var editorDiv = document.getElementById("divEditor");
    if (!editorDiv) return;

    var editor = EditorTeksta(editorDiv);
    var porukeDiv = document.getElementById("poruke");
    
    const urlParams = new URLSearchParams(window.location.search);
    var currentScenarioId = urlParams.get('id') || 1;
    var currentUserId = 123; 

    function setMessage(msg) {
        if (!porukeDiv) return;
        porukeDiv.textContent = "";
        porukeDiv.textContent = msg;
    }

    function pretty(obj) {
        return JSON.stringify(obj, null, 2);
    }

    function updateSceneList() {
        var ul = document.querySelector('.scenes-list');
        if (!ul) return;

        var content = editorDiv.innerText;
        var lines = content.split('\n');
        var scenes = [];
        
        lines.forEach((line) => {
            var trim = line.trim();
            if (/^(INT\.|EXT\.)/i.test(trim)) {
                scenes.push(trim);
            }
        });

        ul.innerHTML = "";
        
        var header = document.querySelector('.sidebar-header');
        if(header) header.textContent = `Scenes (${scenes.length})`;

        if (scenes.length === 0) {
            ul.innerHTML = '<li class="scene-item"><div class="scene-title">No scenes detected</div></li>';
        } else {
            scenes.forEach((sceneName, idx) => {
                var li = document.createElement('li');
                li.className = 'scene-item';
                li.classList.toggle('active', idx === 0);
                
                li.innerHTML = `
                    <div class="scene-title">${idx + 1}. ${sceneName}</div>
                    <div class="scene-pages"></div>
                `;
                ul.appendChild(li);
            });
        }
    }

    function loadScenario() {
        setMessage("Loading...");
        PoziviAjax.getScenario(currentScenarioId, function(status, data) {
            if (status === 200) {

                var linesArray = data.content || data.lines || [];
                var fullText = linesArray.map(l => l.text).join("\n");
                
                editorDiv.innerText = fullText;
                setMessage("Loaded: " + data.title);
                updateSceneList();
            } else if (status === 404) {
                if(currentScenarioId == 1) {
                    PoziviAjax.postScenario("Default Scenario", function(s, d) {
                        if(s === 200) {
                            editorDiv.innerText = "";
                            setMessage("Created new default scenario.");
                            updateSceneList();
                        }
                    });
                } else {
                    setMessage("Scenario not found.");
                }
            } else {
                setMessage("Error loading: " + status);
            }
        });
    }

    function saveToServer() {
        var content = editorDiv.innerText;
        setMessage("Saving...");


        PoziviAjax.lockLine(currentScenarioId, 1, currentUserId, function(lockStatus, lockData) {
            if (lockStatus === 200 || lockStatus === 409) { 
                 PoziviAjax.updateLine(currentScenarioId, 1, currentUserId, content, function(status, data) {
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

    document.addEventListener("keydown", function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault(); 
            saveToServer();
        }
    });

    loadScenario();
    
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
            setMessage("Ukupan broj linija koje uloga \"" + name + "\" izgovara: " + count);
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
});
