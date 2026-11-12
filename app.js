(function () {
    // shortcut: slide count is fixed here; update it when adding/removing files in slides/
    var N = 14,
        st = document.getElementById("stage");
    Promise.all(
        Array.from({ length: N }, function (_, k) {
            return fetch("slides/" + String(k + 1).padStart(2, "0") + ".html").then(function (r) {
                if (!r.ok) throw new Error(r.url + " " + r.status);
                return r.text();
            });
        }),
    )
        .then(function (h) {
            st.innerHTML = h.join("\n");
            init();
        })
        .catch(function (e) {
            st.textContent = "Erro ao carregar os slides: " + e.message;
        });
    function init() {
        var S = [].slice.call(document.querySelectorAll(".slide")),
            i = 0,
            st = document.getElementById("stage");
        var WG = S.map(function (s) {
            var el = s.querySelector(".wg");
            return el ? makeWidget(el) : null;
        });
        function makeWidget(el) {
            var fr = [].slice.call(el.querySelectorAll(".wf")),
                li = [].slice.call(el.querySelectorAll(".wl li")),
                n = fr.length,
                step = el.querySelector(".wstep"),
                txt = el.querySelector(".wtext"),
                cnt = el.querySelector(".wcount"),
                autoB = el.querySelector(".wauto"),
                sp = el.querySelector(".wspeed"),
                bar = el.querySelector(".wbar i"),
                t = null;
            var w = { i: 0, n: n, playing: false };
            w.show = function (k) {
                w.i = (k + n) % n;
                fr.forEach(function (f, j) {
                    f.hidden = j !== w.i;
                });
                li.forEach(function (l, j) {
                    l.classList.toggle("cur", j === w.i);
                    l.classList.toggle("done", j < w.i);
                });
                step.textContent = "Passo " + (w.i + 1) + " de " + n + " · " + li[w.i].getAttribute("data-label");
                txt.textContent = li[w.i].getAttribute("data-msg");
                cnt.textContent = "(" + (w.i + 1) + "/" + n + ")";
                if (w.playing) schedule();
            };
            function schedule() {
                clearTimeout(t);
                var d = +sp.value,
                    wait = w.i === n - 1 ? d * 1.6 : d;
                el.style.setProperty("--dur", wait + "ms");
                el.classList.remove("playing");
                void bar.offsetWidth;
                el.classList.add("playing");
                t = setTimeout(function () {
                    w.show(w.i === n - 1 ? 0 : w.i + 1);
                }, wait);
            }
            w.play = function (on) {
                w.playing = on;
                autoB.setAttribute("aria-pressed", on ? "true" : "false");
                autoB.querySelector(".ic").innerHTML = on ? "&#10074;&#10074;" : "&#9654;";
                if (on) schedule();
                else {
                    clearTimeout(t);
                    el.classList.remove("playing");
                }
            };
            w.toggle = function () {
                w.play(!w.playing);
            };
            el.querySelector(".wprev").onclick = function () {
                w.play(false);
                w.show(w.i - 1);
            };
            el.querySelector(".wnext").onclick = function () {
                w.play(false);
                w.show(w.i + 1);
            };
            el.querySelector(".wreset").onclick = function () {
                w.play(false);
                w.show(0);
            };
            autoB.onclick = w.toggle;
            sp.onchange = function () {
                if (w.playing) schedule();
            };
            li.forEach(function (l, j) {
                l.querySelector("button").onclick = function () {
                    w.play(false);
                    w.show(j);
                };
            });
            w.show(0);
            return w;
        }
        var dk = document.getElementById("deck");
        function fit() {
            var k = Math.min(dk.clientWidth / 1280, dk.clientHeight / 720);
            st.style.transform = "scale(" + k + ")";
        }
        function notes() {
            var on = document.body.classList.toggle("shownotes");
            document.getElementById("nt").setAttribute("aria-pressed", on ? "true" : "false");
            document.getElementById("nt").textContent = on ? "Ocultar notas" : "Notas";
            fit();
        }
        function go(n, back) {
            var prev = i;
            i = Math.max(0, Math.min(S.length - 1, n));
            WG.forEach(function (w, j) {
                if (w && j !== i) w.play(false);
            });
            if (WG[i] && prev !== i) WG[i].show(back ? WG[i].n - 1 : 0);
            S.forEach(function (s, j) {
                s.classList.toggle("on", j === i);
                s.setAttribute("aria-hidden", j === i ? "false" : "true");
            });
            document.getElementById("count").textContent = i + 1 + " / " + S.length;
            document.getElementById("notesText").textContent = S[i].querySelector(".notes").textContent;
            try {
                history.replaceState(null, "", "#" + (i + 1));
            } catch (e) {}
        }
        function fsToggle() {
            try {
                if (!document.fullscreenElement) document.documentElement.requestFullscreen();
                else document.exitFullscreen();
            } catch (e) {}
        }
        addEventListener("resize", fit);
        addEventListener("keydown", function (e) {
            var k = e.key;
            var w = WG[i],
                tg = e.target && e.target.tagName;
            if (tg === "SELECT") return;
            if (tg === "BUTTON" && (k === " " || k === "Enter")) return;
            if (k === "ArrowRight" || k === "PageDown" || k === " " || k === "Enter") {
                e.preventDefault();
                if (w && w.i < w.n - 1 && k !== "PageDown") {
                    w.play(false);
                    w.show(w.i + 1);
                } else go(i + 1);
            } else if (k === "ArrowLeft" || k === "PageUp" || k === "Backspace") {
                e.preventDefault();
                if (w && w.i > 0 && k !== "PageUp") {
                    w.play(false);
                    w.show(w.i - 1);
                } else go(i - 1, true);
            } else if ((k === "a" || k === "A") && w) {
                w.toggle();
            } else if (k === "Home") go(0);
            else if (k === "End") go(S.length - 1);
            else if (k === "n" || k === "N") notes();
            else if (k === "f" || k === "F") fsToggle();
        });
        document.getElementById("prev").onclick = function () {
            go(i - 1, true);
        };
        document.getElementById("next").onclick = function () {
            go(i + 1);
        };
        document.getElementById("nt").onclick = notes;
        document.getElementById("ntClose").onclick = notes;
        document.getElementById("fs").onclick = fsToggle;
        addEventListener("hashchange", function () {
            var h = parseInt(location.hash.slice(1), 10);
            if (!isNaN(h) && h - 1 !== i) go(h - 1);
        });
        var h = parseInt((location.hash || "").slice(1), 10);
        fit();
        go(isNaN(h) ? 0 : h - 1);
    }
})();
