// ==UserScript==
// @name         Komga Series Search
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Recherche rapide de séries Komga avec raccourci clavier
// @author       You
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // === CONFIGURATION ===
    const KOMGA_URL = 'http://localhost:25600'; // URL de votre serveur Komga
    const KOMGA_API_KEY = '';                     // Votre API Key Komga (Settings > Users > API Key)
    const SHORTCUT_KEY = 'y';                    // Touche du raccourci
    const SHORTCUT_MODIFIER = 'ctrlKey';         // Modificateur: ctrlKey, altKey, shiftKey

    // === STYLES ===
    GM_addStyle(`
        #komga-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.75);
            z-index: 999999;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding-top: 10vh;
        }

        #komga-modal {
            background: #0f0f12;
            border: 1px solid #2a2a35;
            border-radius: 12px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6);
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        #komga-header {
            padding: 16px 20px;
            background: #18181f;
            border-bottom: 1px solid #2a2a35;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        #komga-search-input {
            flex: 1;
            padding: 12px 16px;
            border: 1px solid #3a3a48;
            border-radius: 8px;
            background: #0f0f12;
            color: #e8e8ed;
            font-size: 16px;
            outline: none;
        }

        #komga-search-input::placeholder {
            color: #6b6b7a;
        }

        #komga-search-input:focus {
            border-color: #5c8fd6;
            box-shadow: 0 0 0 3px rgba(92, 143, 214, 0.2);
        }

        #komga-back-btn {
            padding: 10px 16px;
            background: #252530;
            border: 1px solid #3a3a48;
            border-radius: 8px;
            color: #d0d0da;
            cursor: pointer;
            font-size: 14px;
            display: none;
        }

        #komga-back-btn:hover {
            background: #32323f;
            border-color: #4a4a58;
        }

        #komga-close-btn {
            padding: 8px 12px;
            background: #c45c5c;
            border: none;
            border-radius: 6px;
            color: #fff;
            cursor: pointer;
            font-weight: 600;
        }

        #komga-close-btn:hover {
            background: #d46a6a;
        }

        #komga-results {
            max-height: 60vh;
            overflow-y: auto;
            padding: 8px;
            background: #0f0f12;
        }

        #komga-results::-webkit-scrollbar {
            width: 8px;
        }

        #komga-results::-webkit-scrollbar-track {
            background: #18181f;
        }

        #komga-results::-webkit-scrollbar-thumb {
            background: #3a3a48;
            border-radius: 4px;
        }

        #komga-results::-webkit-scrollbar-thumb:hover {
            background: #4a4a58;
        }

        .komga-item {
            padding: 14px 16px;
            margin: 4px;
            background: #18181f;
            border: 1px solid #2a2a35;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .komga-item:hover {
            background: #22222c;
            border-color: #3a3a48;
        }

        .komga-item.selected {
            background: #1a2a3a;
            border-color: #5c8fd6;
        }

        .komga-item-thumbnail {
            width: 50px;
            height: 70px;
            object-fit: cover;
            border-radius: 4px;
            background: #252530;
            border: 1px solid #2a2a35;
        }

        .komga-item-info {
            flex: 1;
            min-width: 0;
        }

        .komga-item-title {
            color: #e8e8ed;
            font-size: 15px;
            font-weight: 500;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .komga-item-meta {
            color: #8888a0;
            font-size: 13px;
        }

        .komga-book-number {
            background: #5c8fd6;
            color: #fff;
            padding: 3px 10px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 13px;
        }

        #komga-loading {
            padding: 40px;
            text-align: center;
            color: #8888a0;
        }

        .komga-spinner {
            width: 30px;
            height: 30px;
            border: 3px solid #2a2a35;
            border-top-color: #5c8fd6;
            border-radius: 50%;
            animation: komga-spin 0.8s linear infinite;
            margin: 0 auto 12px;
        }

        @keyframes komga-spin {
            to { transform: rotate(360deg); }
        }

        #komga-status {
            padding: 12px 20px;
            background: #18181f;
            color: #8888a0;
            font-size: 13px;
            border-top: 1px solid #2a2a35;
        }

        .komga-empty {
            padding: 40px;
            text-align: center;
            color: #6b6b7a;
        }
    `);

    // === STATE ===
    let isOpen = false;
    let currentView = 'search'; // 'search' or 'books'
    let seriesData = [];
    let booksData = [];
    let selectedIndex = 0;
    let currentSeriesId = null;
    let currentSeriesName = '';

    // === API CALLS ===
    function komgaRequest(endpoint) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${KOMGA_URL}${endpoint}`,
                headers: {
                    'X-Auth-Token': KOMGA_API_KEY,
                    'Content-Type': 'application/json'
                },
                onload: function(response) {
                    if (response.status === 200) {
                        resolve(JSON.parse(response.responseText));
                    } else {
                        reject(new Error(`Erreur ${response.status}`));
                    }
                },
                onerror: function(error) {
                    reject(error);
                }
            });
        });
    }

    function searchSeries(query) {
        return komgaRequest(`/api/v1/series?search=${encodeURIComponent(query)}&size=20`)
            .then(data => data.content || []);
    }

    function getSeriesBooks(seriesId) {
        return komgaRequest(`/api/v1/series/${seriesId}/books?sort=metadata.numberSort,desc&size=500`)
            .then(data => data.content || []);
    }

    function loadThumbnail(img, type, id) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: `${KOMGA_URL}/api/v1/${type}/${id}/thumbnail`,
            headers: { 'X-Auth-Token': KOMGA_API_KEY },
            responseType: 'blob',
            onload: function(response) {
                if (response.status === 200) {
                    const reader = new FileReader();
                    reader.onload = () => { img.src = reader.result; };
                    reader.readAsDataURL(response.response);
                }
            }
        });
    }

    // === UI ===
    function createModal() {
        const overlay = document.createElement('div');
        overlay.id = 'komga-overlay';
        overlay.innerHTML = `
            <div id="komga-modal">
                <div id="komga-header">
                    <button id="komga-back-btn">← Retour</button>
                    <input type="text" id="komga-search-input" placeholder="Rechercher une série..." autofocus>
                    <button id="komga-close-btn">Esc</button>
                </div>
                <div id="komga-results">
                    <div class="komga-empty">Tapez pour rechercher une série</div>
                </div>
                <div id="komga-status">Ctrl+Y pour ouvrir | ↑↓ navigation | Enter sélectionner | Esc fermer</div>
            </div>
        `;

        document.body.appendChild(overlay);

        const input = overlay.querySelector('#komga-search-input');
        const closeBtn = overlay.querySelector('#komga-close-btn');
        const backBtn = overlay.querySelector('#komga-back-btn');

        let searchTimeout;
        input.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (currentView === 'search' && e.target.value.trim()) {
                    performSearch(e.target.value.trim());
                }
            }, 300);
        });

        input.addEventListener('keydown', handleKeydown);
        closeBtn.addEventListener('click', closeModal);
        backBtn.addEventListener('click', goBackToSearch);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // Global keyboard handler for the modal
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                if (currentView === 'books') {
                    goBackToSearch();
                } else {
                    closeModal();
                }
            }
        });

        // Make overlay focusable and keep focus inside modal
        overlay.setAttribute('tabindex', '-1');
        overlay.focus();
        input.focus();
    }

    function performSearch(query) {
        showLoading();
        searchSeries(query)
            .then(series => {
                seriesData = series;
                selectedIndex = 0;
                renderSeriesList();
            })
            .catch(err => {
                showError('Erreur de connexion à Komga: ' + err.message);
            });
    }

    function showLoading() {
        const results = document.querySelector('#komga-results');
        results.innerHTML = `
            <div id="komga-loading">
                <div class="komga-spinner"></div>
                Chargement...
            </div>
        `;
    }

    function showError(message) {
        const results = document.querySelector('#komga-results');
        results.innerHTML = `<div class="komga-empty">${message}</div>`;
    }

    function renderSeriesList() {
        const results = document.querySelector('#komga-results');

        if (seriesData.length === 0) {
            results.innerHTML = '<div class="komga-empty">Aucune série trouvée</div>';
            return;
        }

        results.innerHTML = seriesData.map((series, index) => `
            <div class="komga-item ${index === selectedIndex ? 'selected' : ''}" data-index="${index}" data-id="${series.id}">
                <img class="komga-item-thumbnail" data-type="series" data-thumb-id="${series.id}" alt="">
                <div class="komga-item-info">
                    <div class="komga-item-title">${escapeHtml(series.metadata.title)}</div>
                    <div class="komga-item-meta">${series.booksCount} tome(s)</div>
                </div>
            </div>
        `).join('');

        results.querySelectorAll('.komga-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                selectSeries(index);
            });
        });

        results.querySelectorAll('.komga-item-thumbnail').forEach(img => {
            loadThumbnail(img, img.dataset.type, img.dataset.thumbId);
        });
    }

    function selectSeries(index) {
        const series = seriesData[index];
        if (!series) return;

        currentSeriesId = series.id;
        currentSeriesName = series.metadata.title;
        currentView = 'books';

        const input = document.querySelector('#komga-search-input');
        const backBtn = document.querySelector('#komga-back-btn');

        input.value = '';
        input.placeholder = `Tomes de: ${currentSeriesName}`;
        input.readOnly = true;
        backBtn.style.display = 'block';

        showLoading();
        getSeriesBooks(series.id)
            .then(books => {
                booksData = books;
                selectedIndex = 0;
                renderBooksList();
            })
            .catch(err => {
                showError('Erreur lors du chargement des tomes: ' + err.message);
            });
    }

    function renderBooksList() {
        const results = document.querySelector('#komga-results');

        if (booksData.length === 0) {
            results.innerHTML = '<div class="komga-empty">Aucun tome trouvé</div>';
            return;
        }

        results.innerHTML = booksData.map((book, index) => `
            <div class="komga-item ${index === selectedIndex ? 'selected' : ''}" data-index="${index}" data-id="${book.id}">
                <img class="komga-item-thumbnail" data-type="books" data-thumb-id="${book.id}" alt="">
                <div class="komga-item-info">
                    <div class="komga-item-title">${escapeHtml(book.metadata.title)}</div>
                    <div class="komga-item-meta">${book.media.pagesCount} pages • ${book.size ? formatSize(book.size) : ''}</div>
                </div>
                <span class="komga-book-number">#${book.metadata.number || index + 1}</span>
            </div>
        `).join('');

        results.querySelectorAll('.komga-item-thumbnail').forEach(img => {
            loadThumbnail(img, img.dataset.type, img.dataset.thumbId);
        });

        updateStatus(`${booksData.length} tome(s) - Ordre décroissant`);
    }

    function goBackToSearch() {
        currentView = 'search';
        currentSeriesId = null;
        booksData = [];
        selectedIndex = 0;

        const input = document.querySelector('#komga-search-input');
        const backBtn = document.querySelector('#komga-back-btn');

        input.value = '';
        input.placeholder = 'Rechercher une série...';
        input.readOnly = false;
        backBtn.style.display = 'none';

        renderSeriesList();
        updateStatus('Ctrl+Y pour ouvrir | ↑↓ navigation | Enter sélectionner | Esc fermer');
        input.focus();
    }

    function handleKeydown(e) {
        const items = currentView === 'search' ? seriesData : booksData;

        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (selectedIndex < items.length - 1) {
                    selectedIndex++;
                    updateSelection();
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (selectedIndex > 0) {
                    selectedIndex--;
                    updateSelection();
                }
                break;

            case 'Enter':
                e.preventDefault();
                if (currentView === 'search' && seriesData.length > 0) {
                    selectSeries(selectedIndex);
                }
                break;

            case 'Escape':
                e.preventDefault();
                if (currentView === 'books') {
                    goBackToSearch();
                } else {
                    closeModal();
                }
                break;

            case 'Backspace':
                if (currentView === 'books') {
                    e.preventDefault();
                    goBackToSearch();
                }
                break;
        }
    }

    function updateSelection() {
        const results = document.querySelector('#komga-results');
        const items = results.querySelectorAll('.komga-item');

        items.forEach((item, index) => {
            item.classList.toggle('selected', index === selectedIndex);
        });

        const selectedItem = items[selectedIndex];
        if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    function updateStatus(text) {
        const status = document.querySelector('#komga-status');
        if (status) status.textContent = text;
    }

    function closeModal() {
        const overlay = document.querySelector('#komga-overlay');
        if (overlay) {
            overlay.remove();
        }
        isOpen = false;
        currentView = 'search';
        seriesData = [];
        booksData = [];
        selectedIndex = 0;
        currentSeriesId = null;
    }

    function openModal() {
        if (isOpen) return;
        isOpen = true;
        createModal();
    }

    // === HELPERS ===
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatSize(bytes) {
        bytes = Number(bytes);
        if (!bytes || isNaN(bytes)) return '';
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        while (bytes >= 1024 && i < units.length - 1) {
            bytes /= 1024;
            i++;
        }
        return bytes.toFixed(1) + ' ' + units[i];
    }

    // === KEYBOARD SHORTCUT ===
    document.addEventListener('keydown', (e) => {
        if (e[SHORTCUT_MODIFIER] && e.key.toLowerCase() === SHORTCUT_KEY) {
            e.preventDefault();
            if (isOpen) {
                closeModal();
            } else {
                openModal();
            }
        }
    });

    console.log('Komga Search loaded. Press Ctrl+Y to open.');
})();
