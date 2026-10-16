(function () {
    "use strict";

    const CANTOS = window.INFERNO_DATA || [];
    const EXTRA = window.INFERNO_EXTRA || {
        introduction: [],
        note_on_translation: [],
        abbreviations_and_commentators: [],
        names_index: [],
        subjects_index: []
    };

    // Roman numeral map for reference parsing
    const ROMAN_TO_INT = {};
    CANTOS.forEach(c => {
        ROMAN_TO_INT[c.roman] = c.canto;
    });

    // Application State
    const state = {
        currentView: "study",      // 'study' | 'map' | 'indexes' | 'intro'
        currentCanto: 1,           // 1..34
        langMode: "parallel",      // 'parallel' | 'interlinear' | 'it' | 'en'
        noteLang: "both",          // 'both' | 'it' | 'en'
        inlineExplanations: true,
        showNoteArrows: true,
        panelTab: "all-notes",     // 'all-notes' | 'passages'
        selectedVerse: null,       // line number or null
        panelFilterText: "",
        sidebarFilterText: "",
        indexType: "names",        // 'names' | 'subjects' | 'commentators'
        indexFilterText: "",
        essayTab: "intro",         // 'intro' | 'translation' | 'guide'
        studiedCantos: JSON.parse(localStorage.getItem("inferno_studied_cantos") || "[]"),
        bookmarks: JSON.parse(localStorage.getItem("inferno_bookmarks") || "[]"),
        theme: localStorage.getItem("inferno_theme") || "dark"
    };

    // Apply saved theme
    document.documentElement.setAttribute("data-theme", state.theme);

    // DOM Elements
    const els = {
        appLayout: document.getElementById("app-layout"),
        sidebarToggle: document.getElementById("sidebar-toggle"),
        brandHome: document.getElementById("brand-home"),
        navTabs: document.querySelectorAll(".nav-tab"),
        views: {
            study: document.getElementById("view-study"),
            map: document.getElementById("view-map"),
            indexes: document.getElementById("view-indexes"),
            intro: document.getElementById("view-intro")
        },
        cantoList: document.getElementById("canto-list"),
        cantoFilterInput: document.getElementById("canto-filter-input"),
        studiedProgressLabel: document.getElementById("studied-progress-label"),
        studiedProgressBar: document.getElementById("studied-progress-bar"),

        // Canto Hero
        readerColumn: document.getElementById("reader-column"),
        prevCantoBtn: document.getElementById("prev-canto-btn"),
        nextCantoBtn: document.getElementById("next-canto-btn"),
        heroCantoRoman: document.getElementById("hero-canto-roman"),
        heroCantoTitle: document.getElementById("hero-canto-title"),
        markStudiedCheckbox: document.getElementById("mark-studied-checkbox"),
        metaCircle: document.getElementById("meta-circle"),
        metaSinners: document.getElementById("meta-sinners"),
        metaCounts: document.getElementById("meta-counts"),
        sumTabs: document.querySelectorAll(".sum-tab"),
        sumOverview: document.getElementById("summary-content-overview"),
        sumContrapasso: document.getElementById("summary-content-contrapasso"),
        sumCharacters: document.getElementById("summary-content-characters"),
        heroSummaryIt: document.getElementById("hero-summary-it"),
        heroSummaryEn: document.getElementById("hero-summary-en"),
        heroContrapassoIt: document.getElementById("hero-contrapasso-it"),
        heroContrapassoEn: document.getElementById("hero-contrapasso-en"),
        heroCharactersList: document.getElementById("hero-characters-list"),
        heroThemesList: document.getElementById("hero-themes-list"),

        // Reader Toolbar & Outline
        langModeBtns: document.querySelectorAll("#lang-mode-control .seg-btn"),
        inlineExplToggle: document.getElementById("inline-explanations-toggle"),
        highlightAnnotatedToggle: document.getElementById("highlight-annotated-toggle"),
        toggleOutlineCollapse: document.getElementById("toggle-outline-collapse"),
        outlineDrawer: document.getElementById("outline-drawer"),
        cantoOutlineGrid: document.getElementById("canto-outline-grid"),
        poetryContainer: document.getElementById("poetry-container"),
        footerPrevBtn: document.getElementById("footer-prev-btn"),
        footerNextBtn: document.getElementById("footer-next-btn"),
        footerPrevTitle: document.getElementById("footer-prev-title"),
        footerNextTitle: document.getElementById("footer-next-title"),

        // Right Commentary Panel
        noteLangBtns: document.querySelectorAll("#note-lang-control .seg-btn"),
        panelTabs: document.querySelectorAll("#panel-tabs .panel-tab"),
        panelNotesCount: document.getElementById("panel-notes-count"),
        panelPassagesCount: document.getElementById("panel-passages-count"),
        panelNoteSearch: document.getElementById("panel-note-search"),
        panelShowAllBtn: document.getElementById("panel-show-all-btn"),
        commentaryBody: document.getElementById("commentary-body"),

        // Map, Indexes, Intro
        hellDiagram: document.getElementById("hell-interactive-diagram"),
        indexTypeBtns: document.querySelectorAll("#index-type-control .seg-btn"),
        indexSearchInput: document.getElementById("index-search-input"),
        indexResultsGrid: document.getElementById("index-results-grid"),
        essayTabs: document.querySelectorAll(".essay-tab"),
        essayBody: document.getElementById("essay-body"),

        // Modals & Theme
        themeToggle: document.getElementById("theme-toggle"),
        openSearchBtn: document.getElementById("open-search-btn"),
        searchModal: document.getElementById("search-modal"),
        closeSearchModal: document.getElementById("close-search-modal"),
        globalSearchInput: document.getElementById("global-search-input"),
        sFilterVerses: document.getElementById("s-filter-verses"),
        sFilterPassages: document.getElementById("s-filter-passages"),
        sFilterNotes: document.getElementById("s-filter-notes"),
        searchStatsCount: document.getElementById("search-stats-count"),
        globalSearchResults: document.getElementById("global-search-results"),

        bookmarksBtn: document.getElementById("bookmarks-btn"),
        bookmarksCount: document.getElementById("bookmarks-count"),
        bookmarksModal: document.getElementById("bookmarks-modal"),
        closeBookmarksModal: document.getElementById("close-bookmarks-modal"),
        bookmarksListContainer: document.getElementById("bookmarks-list-container"),

        lightboxModal: document.getElementById("lightbox-modal"),
        closeLightbox: document.getElementById("close-lightbox"),
        lightboxImg: document.getElementById("lightbox-img"),
        lightboxCaption: document.getElementById("lightbox-caption")
    };

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function getCanto(num) {
        return CANTOS.find(c => c.canto === Number(num)) || CANTOS[0];
    }

    // ==================== SIDEBAR & PROGRESS ====================
    function updateProgressUI() {
        const count = state.studiedCantos.length;
        els.studiedProgressLabel.textContent = `${count} / 34 Canti`;
        els.studiedProgressBar.style.width = `${Math.round((count / 34) * 100)}%`;

        const bCount = state.bookmarks.length;
        if (bCount > 0) {
            els.bookmarksCount.textContent = bCount;
            els.bookmarksCount.classList.remove("hidden");
        } else {
            els.bookmarksCount.classList.add("hidden");
        }
    }

    function renderSidebar() {
        const q = state.sidebarFilterText.trim().toLowerCase();
        const html = [];

        CANTOS.forEach(c => {
            const circleIt = c.circle_it || "";
            const sinnersIt = c.sinners_it || "";
            const chars = (c.characters || []).join(" ");
            const searchable = `${c.canto} ${c.roman} canto ${c.roman} ${circleIt} ${sinnersIt} ${chars}`.toLowerCase();
            if (q && !searchable.includes(q)) return;

            const isActive = c.canto === state.currentCanto;
            const isStudied = state.studiedCantos.includes(c.canto);

            html.push(`
                <button class="canto-nav-item ${isActive ? "active" : ""}" data-canto="${c.canto}">
                    <div class="canto-num-badge">${c.roman}</div>
                    <div class="canto-nav-info">
                        <div class="canto-nav-title">
                            <span>Canto ${c.roman} ${isStudied ? '<span class="studied-dot" title="Studiato">✓</span>' : ""}</span>
                            <span style="font-size:10.5px; color:var(--text-muted);">${c.total_lines} vv.</span>
                        </div>
                        <div class="canto-nav-sub">${escapeHtml(circleIt || c.title)}</div>
                    </div>
                </button>
            `);
        });

        els.cantoList.innerHTML = html.join("") || `<div style="padding:12px; color:var(--text-muted); font-size:12px;">Nessun canto trovato.</div>`;

        els.cantoList.querySelectorAll(".canto-nav-item").forEach(btn => {
            btn.addEventListener("click", () => {
                const cNum = Number(btn.getAttribute("data-canto"));
                switchView("study");
                loadCanto(cNum);
            });
        });
    }

    // ==================== CANTO VIEW RENDERING ====================
    function loadCanto(cantoNum, scrollToLine = null) {
        state.currentCanto = Math.max(1, Math.min(34, Number(cantoNum)));
        state.selectedVerse = scrollToLine;
        state.panelFilterText = "";
        els.panelNoteSearch.value = "";
        els.panelShowAllBtn.classList.add("hidden");

        const c = getCanto(state.currentCanto);
        if (!c) return;

        // Update Sidebar Active State
        renderSidebar();
        const activeNav = els.cantoList.querySelector(`.canto-nav-item[data-canto="${c.canto}"]`);
        if (activeNav) {
            activeNav.scrollIntoView({ block: "nearest" });
        }

        // Hero Header
        els.heroCantoRoman.textContent = `CANTO ${c.roman}`;
        els.heroCantoTitle.textContent = `INFERNO ${c.roman} — ${c.circle_it || ""}`;
        els.prevCantoBtn.disabled = c.canto <= 1;
        els.nextCantoBtn.disabled = c.canto >= 34;
        els.markStudiedCheckbox.checked = state.studiedCantos.includes(c.canto);

        els.metaCircle.textContent = `${c.circle_it || "—"} (${c.circle_en || "—"})`;
        els.metaSinners.textContent = `${c.sinners_it || "—"}`;
        els.metaCounts.textContent = `${c.total_lines} Versi · ${c.notes.length} Note critiche · ${c.outline.filter(o => o.type === "item").length} Passaggi`;

        els.heroSummaryIt.textContent = c.summary_it || "";
        els.heroSummaryEn.textContent = c.summary_en || "";
        els.heroContrapassoIt.textContent = c.contrapasso_it || "";
        els.heroContrapassoEn.textContent = c.contrapasso_en || "";

        els.heroCharactersList.innerHTML = (c.characters || [])
            .map(ch => `<span class="chip gold">${escapeHtml(ch)}</span>`)
            .join("");
        els.heroThemesList.innerHTML = (c.themes_it || [])
            .map(th => `<span class="chip">${escapeHtml(th)}</span>`)
            .join("");

        // Footer Navigation
        if (c.canto > 1) {
            const prevC = getCanto(c.canto - 1);
            els.footerPrevBtn.disabled = false;
            els.footerPrevTitle.textContent = `Canto ${prevC.roman} — ${prevC.circle_it || ""}`;
        } else {
            els.footerPrevBtn.disabled = true;
            els.footerPrevTitle.textContent = "Inizio della Cantica";
        }

        if (c.canto < 34) {
            const nextC = getCanto(c.canto + 1);
            els.footerNextBtn.disabled = false;
            els.footerNextTitle.textContent = `Canto ${nextC.roman} — ${nextC.circle_it || ""}`;
        } else {
            els.footerNextBtn.disabled = true;
            els.footerNextTitle.textContent = "Fine dell'Inferno («a riveder le stelle»)";
        }

        renderOutline(c);
        renderVerses(c);
        renderCommentaryPanel(c);

        if (scrollToLine) {
            setTimeout(() => jumpToVerse(scrollToLine, true), 60);
        } else {
            els.readerColumn.scrollTop = 0;
        }
    }

    function renderOutline(c) {
        const rows = c.outline.map((o, idx) => {
            if (o.type === "header") {
                return `
                    <div class="outline-row header-row">
                        <span>${escapeHtml(o.text_it || o.text_en)}</span>
                    </div>
                `;
            }
            const lvlClass = o.level === 2 ? "level-2" : "";
            return `
                <div class="outline-row ${lvlClass}" data-start="${o.start_line || 1}" data-idx="${idx}">
                    <span class="outline-range-badge">vv. ${escapeHtml(o.range)}</span>
                    <div class="outline-desc-col">
                        <span class="outline-desc-it">${escapeHtml(o.text_it || o.text_en)}</span>
                        <span class="outline-desc-en">${escapeHtml(o.text_en)}</span>
                    </div>
                </div>
            `;
        });

        els.cantoOutlineGrid.innerHTML = rows.join("");
        els.cantoOutlineGrid.querySelectorAll(".outline-row[data-start]").forEach(row => {
            row.addEventListener("click", () => {
                const startLine = Number(row.getAttribute("data-start"));
                jumpToVerse(startLine, true);
            });
        });
    }

    function renderVerses(c) {
        els.poetryContainer.className = `poetry-container mode-${state.langMode}`;

        // Map start_line -> outline items that begin at this verse
        const outlineByStartLine = {};
        c.outline.forEach(o => {
            if (o.type === "item" && o.start_line) {
                if (!outlineByStartLine[o.start_line]) outlineByStartLine[o.start_line] = [];
                outlineByStartLine[o.start_line].push(o);
            }
        });

        // Map verse number -> notes covering or starting on this verse
        const notesByLine = {};
        c.notes.forEach((n, nIdx) => {
            const s = n.start_line || 1;
            const e = n.end_line || s;
            for (let l = s; l <= e; l++) {
                if (!notesByLine[l]) notesByLine[l] = [];
                notesByLine[l].push({ note: n, idx: nIdx });
            }
        });

        const html = [];
        const verses = c.verses;

        // Group into tercets (3 lines each, last line is 1 line)
        for (let i = 0; i < verses.length; i += 3) {
            const chunk = verses.slice(i, i + 3);
            const firstLineNum = chunk[0].num;

            // Check if any outline passage starts within this tercet
            if (state.inlineExplanations) {
                chunk.forEach(v => {
                    const passList = outlineByStartLine[v.num];
                    if (passList) {
                        passList.forEach(p => {
                            html.push(`
                                <div class="inline-passage-card" id="passage-line-${v.num}">
                                    <div class="inline-passage-top">
                                        <span class="inline-passage-badge">Passaggio vv. ${escapeHtml(p.range)}</span>
                                        <span class="inline-passage-title-en">${escapeHtml(p.text_en)}</span>
                                    </div>
                                    <div class="inline-passage-title">${escapeHtml(p.text_it || p.text_en)}</div>
                                    ${p.explanation_it ? `<p class="inline-passage-expl">${escapeHtml(p.explanation_it)}</p>` : ""}
                                </div>
                            `);
                        });
                    }
                });
            }

            html.push(`<div class="tercet-block" data-tercet-start="${firstLineNum}">`);

            chunk.forEach(v => {
                const isTercetMarker = v.num % 3 === 0 || v.num === 1 || v.num === verses.length;
                const lineNotes = notesByLine[v.num] || [];
                const hasNote = v.has_note || lineNotes.length > 0;
                const isBookmarked = state.bookmarks.some(b => b.canto === c.canto && b.line === v.num);
                const isSelected = state.selectedVerse === v.num;

                let textColumnsHtml = "";
                if (state.langMode === "interlinear") {
                    textColumnsHtml = `
                        <div class="verse-texts-wrap">
                            <div class="verse-it">${escapeHtml(v.it)}</div>
                            <div class="verse-en">${escapeHtml(v.en)}</div>
                        </div>
                    `;
                } else {
                    textColumnsHtml = `
                        <div class="verse-it">${escapeHtml(v.it)}</div>
                        <div class="verse-en">${escapeHtml(v.en)}</div>
                    `;
                }

                html.push(`
                    <div class="verse-row ${isSelected ? "selected-verse" : ""}" id="verse-row-${v.num}" data-line="${v.num}">
                        <span class="verse-num ${isTercetMarker ? "tercet-marker" : ""}">${v.num}</span>
                        ${textColumnsHtml}
                        <div class="verse-actions">
                            ${state.showNoteArrows && hasNote ? `<button class="note-indicator-btn" data-note-line="${v.num}" title="Vedi nota critica per il v. ${v.num}">${lineNotes.length > 0 ? lineNotes[0].note.ref : "→"}</button>` : ""}
                            <button class="bookmark-verse-btn ${isBookmarked ? "bookmarked" : ""}" data-bmark-line="${v.num}" title="Salva questo verso nei segnalibri">★</button>
                        </div>
                    </div>
                `);
            });

            html.push(`</div>`);
        }

        els.poetryContainer.innerHTML = html.join("");

        // Attach click listeners on verse rows
        els.poetryContainer.querySelectorAll(".verse-row").forEach(row => {
            row.addEventListener("click", (e) => {
                if (e.target.closest(".bookmark-verse-btn")) return;
                const lineNum = Number(row.getAttribute("data-line"));
                selectVerseAndShowNotes(lineNum);
            });
        });

        // Bookmark button listeners
        els.poetryContainer.querySelectorAll(".bookmark-verse-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const lineNum = Number(btn.getAttribute("data-bmark-line"));
                toggleBookmark(c.canto, lineNum);
                btn.classList.toggle("bookmarked");
            });
        });
    }

    function selectVerseAndShowNotes(lineNum) {
        state.selectedVerse = lineNum;
        els.poetryContainer.querySelectorAll(".verse-row").forEach(r => {
            r.classList.toggle("selected-verse", Number(r.getAttribute("data-line")) === lineNum);
        });

        const c = getCanto(state.currentCanto);
        // Find matching notes for this line (or closest passage)
        const matchingNotes = c.notes.filter(n => lineNum >= n.start_line && lineNum <= n.end_line);
        if (matchingNotes.length > 0) {
            if (state.panelTab !== "all-notes") {
                state.panelTab = "all-notes";
                updatePanelTabButtons();
                renderCommentaryPanel(c);
            }
            const firstRef = matchingNotes[0].ref;
            const targetCard = els.commentaryBody.querySelector(`.note-card[data-ref="${CSS.escape(firstRef)}"]`);
            els.commentaryBody.querySelectorAll(".note-card").forEach(card => card.classList.remove("active-note"));
            if (targetCard) {
                targetCard.classList.add("active-note");
                targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        } else {
            // Scroll to matching passage in commentary panel if in passages tab, or highlight closest note
            const matchingPassage = c.outline.find(o => o.type === "item" && lineNum >= o.start_line && lineNum <= o.end_line);
            if (matchingPassage && state.panelTab === "passages") {
                const targetCard = els.commentaryBody.querySelector(`.note-card[data-passage-range="${CSS.escape(matchingPassage.range)}"]`);
                if (targetCard) {
                    targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }
        }
    }

    function jumpToVerse(lineNum, highlightNote = false) {
        const row = document.getElementById(`verse-row-${lineNum}`);
        if (row) {
            row.scrollIntoView({ behavior: "smooth", block: "center" });
            if (highlightNote) {
                selectVerseAndShowNotes(lineNum);
            }
        }
    }

    // ==================== RIGHT COMMENTARY PANEL ====================
    function updatePanelTabButtons() {
        els.panelTabs.forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-ptab") === state.panelTab);
        });
    }

    function renderCommentaryPanel(c) {
        const passItems = c.outline.filter(o => o.type === "item");
        els.panelNotesCount.textContent = c.notes.length;
        els.panelPassagesCount.textContent = passItems.length;

        const q = state.panelFilterText.trim().toLowerCase();

        if (state.panelTab === "all-notes") {
            const cards = [];
            c.notes.forEach(n => {
                const textIt = n.text_it || "";
                const textEn = n.text_en || "";
                if (q && !`${n.ref} ${textIt} ${textEn}`.toLowerCase().includes(q)) return;

                // Get Italian verse quote for context
                const vStart = c.verses[(n.start_line || 1) - 1];
                const quoteIt = vStart ? vStart.it : "";

                const showIt = (state.noteLang === "both" || state.noteLang === "it") && textIt;
                const showEn = (state.noteLang === "both" || state.noteLang === "en") && textEn;

                cards.push(`
                    <div class="note-card" data-ref="${escapeHtml(n.ref)}" data-start="${n.start_line || 1}">
                        <div class="note-card-header">
                            <span class="note-ref-pill" data-jump="${n.start_line || 1}">vv. ${escapeHtml(n.ref)}</span>
                            <button class="note-jump-link" data-jump="${n.start_line || 1}">Vai al verso ↗</button>
                        </div>
                        ${quoteIt && n.ref !== "Endnote" ? `<div class="note-verse-quote">«${escapeHtml(quoteIt)}»</div>` : ""}
                        ${showIt ? `
                            <div class="note-section-it">
                                <span class="note-lang-tag it">Spiegazione &amp; Commento (IT)</span>
                                <div class="note-text-body">${escapeHtml(textIt)}</div>
                            </div>
                        ` : ""}
                        ${showEn ? `
                            <div class="note-section-en">
                                <span class="note-lang-tag en">Robert Hollander Commentary (EN)</span>
                                <div class="note-text-body">${escapeHtml(textEn)}</div>
                            </div>
                        ` : ""}
                    </div>
                `);
            });

            els.commentaryBody.innerHTML = cards.join("") || `<div style="padding:16px; color:var(--text-muted);">Nessuna nota corrisponde al filtro.</div>`;
        } else {
            // Passages Guide Tab
            const cards = [];
            passItems.forEach(p => {
                const titleIt = p.text_it || "";
                const titleEn = p.text_en || "";
                const explIt = p.explanation_it || "";
                if (q && !`${p.range} ${titleIt} ${titleEn} ${explIt}`.toLowerCase().includes(q)) return;

                cards.push(`
                    <div class="note-card" data-passage-range="${escapeHtml(p.range)}" data-start="${p.start_line || 1}">
                        <div class="note-card-header">
                            <span class="note-ref-pill" data-jump="${p.start_line || 1}">Passaggio vv. ${escapeHtml(p.range)}</span>
                            <button class="note-jump-link" data-jump="${p.start_line || 1}">Leggi versi ↗</button>
                        </div>
                        <div style="font-weight:700; font-size:14px; color:var(--text-primary); margin-bottom:3px;">
                            ${escapeHtml(titleIt || titleEn)}
                        </div>
                        <div style="font-size:12px; color:var(--text-secondary); font-style:italic; margin-bottom:10px;">
                            ${escapeHtml(titleEn)}
                        </div>
                        ${explIt ? `
                            <div class="note-section-it">
                                <span class="note-lang-tag it">Parafrasi &amp; Analisi del Passaggio</span>
                                <div class="note-text-body">${escapeHtml(explIt)}</div>
                            </div>
                        ` : ""}
                    </div>
                `);
            });

            els.commentaryBody.innerHTML = cards.join("") || `<div style="padding:16px; color:var(--text-muted);">Nessun passaggio trovato.</div>`;
        }

        els.commentaryBody.querySelectorAll("[data-jump]").forEach(btn => {
            btn.addEventListener("click", () => {
                const lineNum = Number(btn.getAttribute("data-jump"));
                jumpToVerse(lineNum, false);
            });
        });
    }

    // ==================== VIEW 2: INTERACTIVE MAP OF HELL ====================
    function renderHellMap() {
        const rings = [
            { name: "Selva Oscura & Colle Luminoso", sin: "Smarrimento morale, le Tre Fiere e l'incontro con Virgilio", cantos: [1, 2], width: "100%" },
            { name: "Porta dell'Inferno, Antinferno & Fiume Acheronte", sin: "Ignavi e angeli neutrali; Caronte traghetta le anime dannate", cantos: [3], width: "96%" },
            { name: "I Cerchio — Limbo", sin: "Innocenti non battezzati e Grandi Spiriti dell'antichità («sanza speme vivemo in disio»)", cantos: [4], width: "92%" },
            { name: "II Cerchio — Lussuriosi (Incontinenza)", sin: "Minosse giudice infernale; la bufera eterna travolge i peccatori carnali (Paolo e Francesca)", cantos: [5], width: "88%" },
            { name: "III Cerchio — Golosi (Incontinenza)", sin: "Cerbero; pioggia eterna di grandine, acqua tinta e neve putrida (Ciacco)", cantos: [6], width: "84%" },
            { name: "IV Cerchio — Avari e Prodighi (Incontinenza)", sin: "Pluto; rotolano enormi massi rinfacciandosi la colpa; discorso sulla Fortuna", cantos: [7], width: "80%" },
            { name: "V Cerchio — Palude Stigia: Iracondi e Accidiosi", sin: "Flegiàs; traversata dello Stige (Filippo Argenti) e mura della Città di Dite", cantos: [8, 9], width: "76%" },
            { name: "VI Cerchio — Città di Dite: Eresiarchi ed Epicurei", sin: "Arche infuocate scoperchiate (Farinata degli Uberti, Cavalcante, Federico II) e ordinamento morale dell'Inferno", cantos: [10, 11], width: "72%" },
            { name: "VII Cerchio — Violenti (I, II, III Girone)", sin: "I Girone: Flegetonte (Tiranni e omicidi) · II Girone: Selva dei Suicidi e Scialacquatori · III Girone: Sabbione infuocato (Bestemmiatori, Sodomiti, Usurai)", cantos: [12, 13, 14, 15, 16, 17], width: "66%" },
            { name: "VIII Cerchio — Malebolge (I–X Bolgia: Frode contro chi non si fida)", sin: "1. Ruffiani/Seduttori (XVIII) · 2. Adulatori (XVIII) · 3. Simoniaci (XIX) · 4. Indovini (XX) · 5. Barattieri (XXI-XXII) · 6. Ipocriti (XXIII) · 7. Ladri (XXIV-XXV) · 8. Consiglieri frodolenti (XXVI-XXVII) · 9. Seminatori di discordie (XXVIII) · 10. Falsari (XXIX-XXX)", cantos: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], width: "58%" },
            { name: "Pozzo dei Giganti", sin: "Nembrot, Efialte e Anteo al confine tra Malebolge e il lago ghiacciato di Cocito", cantos: [31], width: "48%" },
            { name: "IX Cerchio — Lago Ghiacciato di Cocito (Traditori)", sin: "1. Caina (Parenti) · 2. Antenora (Patria/Partito) · 3. Tolomea (Ospiti) · 4. Giudecca (Benefattori, Dio e Impero) e Lucifero al centro della Terra", cantos: [32, 33, 34], width: "40%" }
        ];

        els.hellDiagram.innerHTML = rings.map(r => `
            <div class="hell-ring" style="width: ${r.width};">
                <div class="hell-ring-top">
                    <span class="hell-ring-name">${escapeHtml(r.name)}</span>
                </div>
                <div class="hell-ring-sin">${escapeHtml(r.sin)}</div>
                <div class="hell-ring-cantos">
                    ${r.cantos.map(cNum => {
                        const cObj = getCanto(cNum);
                        return `<button class="canto-jump-chip" data-map-canto="${cNum}">Canto ${cObj ? cObj.roman : cNum}</button>`;
                    }).join("")}
                </div>
            </div>
        `).join("");

        els.hellDiagram.querySelectorAll("[data-map-canto]").forEach(btn => {
            btn.addEventListener("click", () => {
                const cNum = Number(btn.getAttribute("data-map-canto"));
                switchView("study");
                loadCanto(cNum);
            });
        });

        // Lightbox on Map Thumbnails
        document.querySelectorAll(".map-thumb-card").forEach(card => {
            card.addEventListener("click", () => {
                const src = card.getAttribute("data-img");
                const cap = card.getAttribute("data-caption");
                els.lightboxImg.src = src;
                els.lightboxCaption.textContent = cap;
                els.lightboxModal.classList.remove("hidden");
            });
        });
    }

    // ==================== VIEW 3: INDEXES ====================
    function parseRefAndJump(refStr) {
        // e.g. "XXVI.93" or "IV.88–90"
        const m = refStr.trim().match(/^([IVXLCDM]+)\.(\d+)/);
        if (!m) return;
        const cNum = ROMAN_TO_INT[m[1]];
        const lineNum = Number(m[2]);
        if (cNum) {
            switchView("study");
            loadCanto(cNum, lineNum);
        }
    }

    function renderIndexes() {
        const q = state.indexFilterText.trim().toLowerCase();

        if (state.indexType === "names") {
            const items = (EXTRA.names_index || []).filter(item => {
                if (!q) return true;
                return item.name.toLowerCase().includes(q) || item.refs.join(" ").toLowerCase().includes(q);
            });

            els.indexResultsGrid.innerHTML = items.map(item => `
                <div class="index-card">
                    <div class="index-card-title">${escapeHtml(item.name)}</div>
                    <div class="index-refs-list">
                        ${item.refs.map(r => `<button class="ref-link-btn" data-ref="${escapeHtml(r)}">${escapeHtml(r)}</button>`).join("")}
                    </div>
                </div>
            `).join("") || `<p>Nessun risultato trovato.</p>`;
        } else if (state.indexType === "subjects") {
            const items = (EXTRA.subjects_index || []).filter(item => {
                if (!q) return true;
                return item.subject.toLowerCase().includes(q) || item.refs.join(" ").toLowerCase().includes(q);
            });

            els.indexResultsGrid.innerHTML = items.map(item => `
                <div class="index-card">
                    <div class="index-card-title">${escapeHtml(item.subject)}</div>
                    <div class="index-refs-list">
                        ${item.refs.map(r => `<button class="ref-link-btn" data-ref="${escapeHtml(r)}">${escapeHtml(r)}</button>`).join("")}
                    </div>
                </div>
            `).join("") || `<p>Nessun argomento trovato.</p>`;
        } else {
            // Commentators
            const paras = EXTRA.abbreviations_and_commentators || [];
            els.indexResultsGrid.innerHTML = `
                <div class="index-card" style="grid-column: 1 / -1; max-width:820px;">
                    <h3 style="margin-top:0; font-family:var(--font-display); color:var(--accent-gold);">Abbreviazioni delle Opere di Dante e Commentatori Storici (1322–1982)</h3>
                    <div style="white-space:pre-line; line-height:1.7; font-size:14px;">${escapeHtml(paras.join("\n\n"))}</div>
                </div>
            `;
        }

        els.indexResultsGrid.querySelectorAll(".ref-link-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                parseRefAndJump(btn.getAttribute("data-ref"));
            });
        });
    }

    // ==================== VIEW 4: INTRODUCTION & ESSAYS ====================
    function renderEssays() {
        if (state.essayTab === "intro") {
            const paras = EXTRA.introduction || [];
            els.essayBody.innerHTML = `
                <h2>Introduction to The Inferno — Robert Hollander</h2>
                ${paras.map(p => `<p>${escapeHtml(p)}</p>`).join("")}
            `;
        } else if (state.essayTab === "translation") {
            const paras = EXTRA.note_on_translation || [];
            els.essayBody.innerHTML = `
                <h2>Note on the Translation — Jean &amp; Robert Hollander</h2>
                ${paras.map(p => `<p>${escapeHtml(p)}</p>`).join("")}
            `;
        } else {
            els.essayBody.innerHTML = `
                <h2>Guida allo Studio dell'Inferno Dantesco</h2>
                <p>L'<strong>Inferno</strong> è la prima delle tre cantiche della <em>Commedia</em> di Dante Alighieri, composta da <strong>34 canti</strong> (un canto proemiale all'intero poema seguito da 33 canti dedicati al regno infernale, in perfetta simmetria con i 33 canti del <em>Purgatorio</em> e del <em>Paradiso</em>) per un totale di <strong>4.720 versi endecasillabi</strong> incatenati in terzine dantesche (schema metrico <code>ABA BCB CDC...</code>).</p>
                <h3>1. Cronologia e Allegoria del Viaggio</h3>
                <p>Il viaggio ultraterreno ha inizio nella notte del <strong>Giovedì Santo del 1300</strong> (anno del primo Giubileo indetto da papa Bonifacio VIII), che secondo il calcolo dantesco cade tra il 24 e il 25 marzo (anniversario dell'Incarnazione e della morte di Cristo) oppure tra il 7 e l'8 aprile. Dante, a trentacinque anni («Nel mezzo del cammin di nostra vita»), si ritrova smarrito nella <em>selva oscura</em> del peccato. L'incontro con <strong>Virgilio</strong>, simbolo della Ragione umana illuminata dalla grazia divina e mosso dall'intervento celeste di tre donne benedette (Maria, Santa Lucia e Beatrice), segna l'inizio del cammino di redenzione attraverso la conoscenza del male.</p>
                <h3>2. Il Sistema Morale dell'Inferno (Canto XI)</h3>
                <p>Nel Canto XI Virgilio espone la rigorosa architettura filosofico-teologica dell'Inferno, fondata sull'<em>Etica Nicomachea</em> di Aristotele integrata dal <em>De officiis</em> di Cicerone:</p>
                <ul>
                    <li><strong>Antinferno (Canto III):</strong> gli <em>Ignavi</em>, coloro che vissero «sanza 'nfamia e sanza lodo», rifiutati sia dal Cielo sia dall'Inferno profondo.</li>
                    <li><strong>Primo Cerchio — Limbo (Canto IV):</strong> gli innocenti non battezzati e gli spiriti magni dell'antichità classica e musulmana, puniti col solo desiderio inappagato della visione di Dio.</li>
                    <li><strong>Cerchi II–V — Peccati di Incontinenza (Canti V–VIII):</strong> dove la passione prevale sulla ragione: Lussuriosi (II), Golosi (III), Avari e Prodighi (IV), Iracondi e Accidiosi nella palude Stigia (V).</li>
                    <li><strong>Sesto Cerchio — Eresia (Canti IX–XI):</strong> dentro le mura infuocate della Città di Dite, gli epicurei che negarono l'immortalità dell'anima giacciono in arche roventi.</li>
                    <li><strong>Settimo Cerchio — Violenza o «Matta Bestialitade» (Canti XII–XVII):</strong> suddiviso in tre gironi: violenti contro il prossimo (Flegetonte), contro sé stessi (Selva dei Suicidi e Scialacquatori) e contro Dio, la Natura e l'Arte (Sabbione infuocato).</li>
                    <li><strong>Ottavo Cerchio — Malebolge: Frode verso chi non si fida (Canti XVIII–XXX):</strong> dieci fossati concentrici di pietra ferrigna che puniscono ruffiani e seduttori, adulatori, simoniaci, indovini, barattieri, ipocriti, ladri, consiglieri frodolenti, seminatori di discordie e falsari.</li>
                    <li><strong>Nono Cerchio — Cocito: Frode verso chi si fida o Tradimento (Canti XXXI–XXXIV):</strong> introdotto dal Pozzo dei Giganti, il lago ghiacciato di Cocito si articola in quattro zone: Caina (traditori dei parenti), Antenora (traditori della patria), Tolomea (traditori degli ospiti) e Giudecca (traditori dei benefattori e della maestà divina e imperiale), al cui centro è confitto Lucifero con Giuda, Bruto e Cassio.</li>
                </ul>
                <h3>3. Come utilizzare questa piattaforma di studio</h3>
                <p>Questa edizione interattiva affianca al testo critico italiano di Giorgio Petrocchi la celebre traduzione inglese in versi e l'intero commento accademico di <strong>Robert e Jean Hollander</strong> (Princeton Dante Project), arricchendoli con <strong>la parafrasi e spiegazione in italiano di tutti i 672 passaggi strutturali</strong> e <strong>la traduzione e sintesi critica in italiano di tutte le 687 note</strong>.</p>
            `;
        }
    }

    // ==================== GLOBAL SEARCH & BOOKMARKS ====================
    function highlightMatch(text, query) {
        if (!query) return escapeHtml(text);
        const safeText = escapeHtml(text);
        const safeQ = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return safeText.replace(new RegExp(`(${safeQ})`, "gi"), "<mark>$1</mark>");
    }

    function runGlobalSearch() {
        const q = els.globalSearchInput.value.trim();
        if (q.length < 2) {
            els.searchStatsCount.textContent = "Digita almeno 2 caratteri...";
            els.globalSearchResults.innerHTML = "";
            return;
        }

        const qLow = q.toLowerCase();
        const incVerses = els.sFilterVerses.checked;
        const incPassages = els.sFilterPassages.checked;
        const incNotes = els.sFilterNotes.checked;

        const hits = [];
        const maxHits = 120;

        for (const c of CANTOS) {
            if (hits.length >= maxHits) break;

            if (incVerses) {
                for (const v of c.verses) {
                    if (v.it.toLowerCase().includes(qLow) || v.en.toLowerCase().includes(qLow)) {
                        hits.push({
                            type: "Verso",
                            canto: c.canto,
                            roman: c.roman,
                            line: v.num,
                            label: `Canto ${c.roman}, v. ${v.num}`,
                            snippet: `${v.it} — ${v.en}`
                        });
                        if (hits.length >= maxHits) break;
                    }
                }
            }

            if (incPassages && hits.length < maxHits) {
                for (const o of c.outline) {
                    if (o.type !== "item") continue;
                    const combined = `${o.text_it || ""} ${o.text_en || ""} ${o.explanation_it || ""}`;
                    if (combined.toLowerCase().includes(qLow)) {
                        hits.push({
                            type: "Passaggio",
                            canto: c.canto,
                            roman: c.roman,
                            line: o.start_line || 1,
                            label: `Canto ${c.roman}, Passaggio vv. ${o.range}`,
                            snippet: `${o.text_it || o.text_en}: ${(o.explanation_it || "").slice(0, 180)}...`
                        });
                        if (hits.length >= maxHits) break;
                    }
                }
            }

            if (incNotes && hits.length < maxHits) {
                for (const n of c.notes) {
                    const combined = `${n.text_it || ""} ${n.text_en || ""}`;
                    if (combined.toLowerCase().includes(qLow)) {
                        const src = (n.text_it && n.text_it.toLowerCase().includes(qLow)) ? n.text_it : n.text_en;
                        const idx = src.toLowerCase().indexOf(qLow);
                        const start = Math.max(0, idx - 60);
                        const sub = src.slice(start, start + 200);
                        hits.push({
                            type: "Nota Critica",
                            canto: c.canto,
                            roman: c.roman,
                            line: n.start_line || 1,
                            label: `Canto ${c.roman}, Nota vv. ${n.ref}`,
                            snippet: (start > 0 ? "..." : "") + sub + "..."
                        });
                        if (hits.length >= maxHits) break;
                    }
                }
            }
        }

        els.searchStatsCount.textContent = `${hits.length}${hits.length >= maxHits ? "+" : ""} risultati trovati`;
        els.globalSearchResults.innerHTML = hits.map(h => `
            <div class="search-hit-card" data-canto="${h.canto}" data-line="${h.line}">
                <div class="search-hit-top">
                    <span>${escapeHtml(h.label)}</span>
                    <span>${escapeHtml(h.type)}</span>
                </div>
                <div class="search-hit-text">${highlightMatch(h.snippet, q)}</div>
            </div>
        `).join("") || `<div style="padding:14px; color:var(--text-muted);">Nessun risultato per "${escapeHtml(q)}".</div>`;

        els.globalSearchResults.querySelectorAll(".search-hit-card").forEach(card => {
            card.addEventListener("click", () => {
                const cNum = Number(card.getAttribute("data-canto"));
                const lineNum = Number(card.getAttribute("data-line"));
                els.searchModal.classList.add("hidden");
                switchView("study");
                loadCanto(cNum, lineNum);
            });
        });
    }

    function toggleBookmark(cantoNum, lineNum) {
        const idx = state.bookmarks.findIndex(b => b.canto === cantoNum && b.line === lineNum);
        if (idx >= 0) {
            state.bookmarks.splice(idx, 1);
        } else {
            const c = getCanto(cantoNum);
            const v = c.verses[lineNum - 1];
            state.bookmarks.push({
                canto: cantoNum,
                roman: c.roman,
                line: lineNum,
                it: v ? v.it : "",
                en: v ? v.en : ""
            });
        }
        localStorage.setItem("inferno_bookmarks", JSON.stringify(state.bookmarks));
        updateProgressUI();
    }

    function renderBookmarksModal() {
        if (state.bookmarks.length === 0) {
            els.bookmarksListContainer.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted);">Non hai ancora salvato alcun verso. Clicca sulla stellina (★) accanto a qualsiasi verso per salvarlo qui.</div>`;
            return;
        }

        els.bookmarksListContainer.innerHTML = state.bookmarks.map((b, i) => `
            <div class="search-hit-card" data-canto="${b.canto}" data-line="${b.line}">
                <div class="search-hit-top">
                    <span>Inferno ${escapeHtml(b.roman)}, v. ${b.line}</span>
                    <button class="btn-xs remove-bmark-btn" data-idx="${i}">Rimuovi ✕</button>
                </div>
                <div class="search-hit-text" style="font-family:var(--font-serif); font-size:17px;">${escapeHtml(b.it)}</div>
                <div style="font-family:var(--font-serif); font-size:15px; color:var(--text-secondary); font-style:italic;">${escapeHtml(b.en)}</div>
            </div>
        `).join("");

        els.bookmarksListContainer.querySelectorAll(".search-hit-card").forEach(card => {
            card.addEventListener("click", (e) => {
                if (e.target.closest(".remove-bmark-btn")) return;
                const cNum = Number(card.getAttribute("data-canto"));
                const lineNum = Number(card.getAttribute("data-line"));
                els.bookmarksModal.classList.add("hidden");
                switchView("study");
                loadCanto(cNum, lineNum);
            });
        });

        els.bookmarksListContainer.querySelectorAll(".remove-bmark-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const idx = Number(btn.getAttribute("data-idx"));
                state.bookmarks.splice(idx, 1);
                localStorage.setItem("inferno_bookmarks", JSON.stringify(state.bookmarks));
                updateProgressUI();
                renderBookmarksModal();
                renderVerses(getCanto(state.currentCanto));
            });
        });
    }

    // ==================== VIEW SWITCHING & EVENTS ====================
    function switchView(viewName) {
        state.currentView = viewName;
        els.navTabs.forEach(t => {
            t.classList.toggle("active", t.getAttribute("data-view") === viewName);
        });
        Object.keys(els.views).forEach(k => {
            els.views[k].classList.toggle("active", k === viewName);
        });
    }

    function initEvents() {
        // Sidebar collapse toggle
        els.sidebarToggle.addEventListener("click", () => {
            els.appLayout.classList.toggle("sidebar-collapsed");
        });

        els.brandHome.addEventListener("click", () => {
            switchView("study");
            loadCanto(1);
        });

        // Top navigation tabs
        els.navTabs.forEach(tab => {
            tab.addEventListener("click", () => {
                switchView(tab.getAttribute("data-view"));
            });
        });

        // Sidebar filter
        els.cantoFilterInput.addEventListener("input", () => {
            state.sidebarFilterText = els.cantoFilterInput.value;
            renderSidebar();
        });

        // Prev / Next Canto buttons
        els.prevCantoBtn.addEventListener("click", () => loadCanto(state.currentCanto - 1));
        els.nextCantoBtn.addEventListener("click", () => loadCanto(state.currentCanto + 1));
        els.footerPrevBtn.addEventListener("click", () => loadCanto(state.currentCanto - 1));
        els.footerNextBtn.addEventListener("click", () => loadCanto(state.currentCanto + 1));

        // Studied checkbox
        els.markStudiedCheckbox.addEventListener("change", () => {
            const cNum = state.currentCanto;
            const idx = state.studiedCantos.indexOf(cNum);
            if (els.markStudiedCheckbox.checked && idx === -1) {
                state.studiedCantos.push(cNum);
            } else if (!els.markStudiedCheckbox.checked && idx >= 0) {
                state.studiedCantos.splice(idx, 1);
            }
            localStorage.setItem("inferno_studied_cantos", JSON.stringify(state.studiedCantos));
            updateProgressUI();
            renderSidebar();
        });

        // Hero Summary Tabs
        els.sumTabs.forEach(tab => {
            tab.addEventListener("click", () => {
                els.sumTabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                const target = tab.getAttribute("data-sumtab");
                els.sumOverview.classList.toggle("hidden", target !== "overview");
                els.sumContrapasso.classList.toggle("hidden", target !== "contrapasso");
                els.sumCharacters.classList.toggle("hidden", target !== "characters");
            });
        });

        // Reader Toolbar: Language mode
        els.langModeBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                els.langModeBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                state.langMode = btn.getAttribute("data-mode");
                renderVerses(getCanto(state.currentCanto));
            });
        });

        els.inlineExplToggle.addEventListener("change", () => {
            state.inlineExplanations = els.inlineExplToggle.checked;
            renderVerses(getCanto(state.currentCanto));
        });

        els.highlightAnnotatedToggle.addEventListener("change", () => {
            state.showNoteArrows = els.highlightAnnotatedToggle.checked;
            renderVerses(getCanto(state.currentCanto));
        });

        els.toggleOutlineCollapse.addEventListener("click", () => {
            els.outlineDrawer.classList.toggle("hidden");
            els.toggleOutlineCollapse.textContent = els.outlineDrawer.classList.contains("hidden")
                ? "Indice Passaggi ▸"
                : "Indice Passaggi ▾";
        });

        // Right Commentary Panel controls
        els.noteLangBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                els.noteLangBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                state.noteLang = btn.getAttribute("data-notelang");
                renderCommentaryPanel(getCanto(state.currentCanto));
            });
        });

        els.panelTabs.forEach(tab => {
            tab.addEventListener("click", () => {
                state.panelTab = tab.getAttribute("data-ptab");
                updatePanelTabButtons();
                renderCommentaryPanel(getCanto(state.currentCanto));
            });
        });

        els.panelNoteSearch.addEventListener("input", () => {
            state.panelFilterText = els.panelNoteSearch.value;
            renderCommentaryPanel(getCanto(state.currentCanto));
        });

        // Indexes controls
        els.indexTypeBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                els.indexTypeBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                state.indexType = btn.getAttribute("data-idxtype");
                renderIndexes();
            });
        });

        els.indexSearchInput.addEventListener("input", () => {
            state.indexFilterText = els.indexSearchInput.value;
            renderIndexes();
        });

        // Essay tabs
        els.essayTabs.forEach(tab => {
            tab.addEventListener("click", () => {
                els.essayTabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                state.essayTab = tab.getAttribute("data-essay");
                renderEssays();
            });
        });

        // Theme Toggle
        els.themeToggle.addEventListener("click", () => {
            state.theme = state.theme === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", state.theme);
            localStorage.setItem("inferno_theme", state.theme);
        });

        // Search Modal
        els.openSearchBtn.addEventListener("click", () => {
            els.searchModal.classList.remove("hidden");
            els.globalSearchInput.focus();
        });
        els.closeSearchModal.addEventListener("click", () => els.searchModal.classList.add("hidden"));
        els.globalSearchInput.addEventListener("input", runGlobalSearch);
        els.sFilterVerses.addEventListener("change", runGlobalSearch);
        els.sFilterPassages.addEventListener("change", runGlobalSearch);
        els.sFilterNotes.addEventListener("change", runGlobalSearch);

        // Bookmarks Modal
        els.bookmarksBtn.addEventListener("click", () => {
            renderBookmarksModal();
            els.bookmarksModal.classList.remove("hidden");
        });
        els.closeBookmarksModal.addEventListener("click", () => els.bookmarksModal.classList.add("hidden"));

        // Lightbox close
        els.closeLightbox.addEventListener("click", () => els.lightboxModal.classList.add("hidden"));

        // Close modals on backdrop click or Escape
        [els.searchModal, els.bookmarksModal, els.lightboxModal].forEach(modal => {
            modal.addEventListener("click", (e) => {
                if (e.target === modal) modal.classList.add("hidden");
            });
        });

        document.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                els.searchModal.classList.remove("hidden");
                els.globalSearchInput.focus();
            } else if (e.key === "Escape") {
                els.searchModal.classList.add("hidden");
                els.bookmarksModal.classList.add("hidden");
                els.lightboxModal.classList.add("hidden");
            }
        });
    }

    // Initialize App
    updateProgressUI();
    initEvents();
    renderHellMap();
    renderIndexes();
    renderEssays();
    loadCanto(1);
})();
