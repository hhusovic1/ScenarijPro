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

    var btnBrojRijeci = document.getElementById("btnBrojRijeci");
    if (btnBrojRijeci) {
        btnBrojRijeci.addEventListener("click", function () {
            var res = editor.dajBrojRijeci();
            setMessage("Broj riječi: " + res.ukupno +
                ", boldiranih: " + res.boldiranih +
                ", italic: " + res.italic);
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
