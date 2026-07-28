/* =========================================================================
   StudySpark AI Pro — script.js
   Vanilla JS. No frameworks, no build step.
   Handles: theming, history (localStorage), API calls, markdown -> cards,
   export, speech, search, and all UI wiring.
   ========================================================================= */

(() => {
  'use strict';

  /* ----------------------------- Config ----------------------------- */
  const API_ENDPOINT = 'https://st-97429f0d16bd478ba9c66c5a2b1a562b.ecs.ap-south-1.on.aws/api/generate';
  const STORAGE_KEYS = {
    history: 'studyspark_history_v1',
    theme: 'studyspark_theme',
    fontSize: 'studyspark_font_size',
  };
  const LOADING_MESSAGES = [
    'Thinking…',
    'Analyzing topic…',
    'Structuring key concepts…',
    'Creating summary…',
    'Drawing diagrams…',
    'Building comparison tables…',
    'Generating quiz…',
    'Preparing viva questions…',
    'Polishing your notes…',
  ];

  // Section definitions: order, emoji, title, and the aliases the model might use.
  const SECTIONS = [
    { key: 'summary', emoji: '📖', title: 'Summary' },
    { key: 'objectives', emoji: '🎯', title: 'Learning Objectives' },
    { key: 'concepts', emoji: '⭐', title: 'Key Concepts' },
    { key: 'diagram', emoji: '🧠', title: 'Visual Explanation' },
    { key: 'comparison', emoji: '📊', title: 'Comparison Table' },
    { key: 'tricks', emoji: '💡', title: 'Memory Tricks' },
    { key: 'realworld', emoji: '🌍', title: 'Real-Life Example' },
    { key: 'advantages', emoji: '✅', title: 'Advantages' },
    { key: 'disadvantages', emoji: '❌', title: 'Disadvantages' },
    { key: 'viva', emoji: '🎤', title: 'Viva Questions' },
    { key: 'examnotes', emoji: '📚', title: 'Anna University 16-Mark Notes' },
    { key: 'quiz', emoji: '🧠', title: 'Quiz' },
    { key: 'references', emoji: '📄', title: 'References' },
  ];

  /* ----------------------------- State ----------------------------- */
  let history = loadHistory();       // array of {id, title, markdown, sections, pinned, createdAt}
  let activeId = null;
  let loadingInterval = null;
  let speechUtterance = null;

  /* ----------------------------- Elements ----------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const el = {
    sidebar: $('#sidebar'),
    sidebarToggle: $('#sidebarToggle'),
    sidebarScrim: $('#sidebarScrim'),
    newChatBtn: $('#newChatBtn'),
    historySearch: $('#historySearch'),
    pinnedList: $('#pinnedList'),
    recentList: $('#recentList'),
    emptyHint: $('#emptyHistoryHint'),
    clearHistoryBtn: $('#clearHistoryBtn'),

    heroSection: $('#heroSection'),
    responseFeed: $('#responseFeed'),
    loadingPanel: $('#loadingPanel'),
    loadingText: $('#loadingText'),
    progressFill: $('#progressFill'),

    topicInput: $('#topicInput'),
    generateBtn: $('#generateBtn'),
    charHint: $('#charHint'),

    darkModeToggle: $('#darkModeToggle'),
    settingsBtn: $('#settingsBtn'),
    settingsOverlay: $('#settingsOverlay'),
    closeSettings: $('#closeSettings'),
    themeSegmented: $('#themeSegmented'),
    fontSegmented: $('#fontSegmented'),
    exportHistoryBtn: $('#exportHistoryBtn'),
    settingsClearBtn: $('#settingsClearBtn'),

    globalSearch: $('#globalSearch'),
    toast: $('#toast'),
    contextMenu: $('#contextMenu'),
    ctxPin: $('#ctxPin'),
  };

  /* ============================= INIT ============================= */
  function init() {
    applyTheme(localStorage.getItem(STORAGE_KEYS.theme) || 'dark');
    applyFontSize(localStorage.getItem(STORAGE_KEYS.fontSize) || 'md');
    renderHistoryLists();
    bindEvents();
    autoResizeTextarea();
  }

  /* ============================= THEME ============================= */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.theme, theme);
    $$('#themeSegmented .seg-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.themeChoice === theme));
  }

  function applyFontSize(size) {
    const scale = { sm: 0.92, md: 1, lg: 1.12 }[size] || 1;
    document.documentElement.style.setProperty('--font-scale', scale);
    localStorage.setItem(STORAGE_KEYS.fontSize, size);
    $$('#fontSegmented .seg-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.fontChoice === size));
  }

  /* ============================= HISTORY (localStorage) ============================= */
  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.history);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to parse history', e);
      return [];
    }
  }

  function saveHistory() {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
  }

  function renderHistoryLists(filter = '') {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? history.filter(h => h.title.toLowerCase().includes(q))
      : history;

    const pinned = filtered.filter(h => h.pinned);
    const recent = filtered.filter(h => !h.pinned).sort((a, b) => b.createdAt - a.createdAt);

    el.pinnedList.innerHTML = pinned.map(h => chatItemHTML(h, q)).join('');
    el.recentList.innerHTML = recent.map(h => chatItemHTML(h, q)).join('');
    $('#pinnedSection').style.display = pinned.length ? '' : 'none';
    el.emptyHint.style.display = (history.length === 0) ? '' : 'none';

    $$('.chat-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.chat-item-more')) return;
        loadTopic(item.dataset.id);
      });
      item.querySelector('.chat-item-more')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openContextMenu(e.currentTarget, item.dataset.id);
      });
    });
  }

  function chatItemHTML(h, q) {
    const title = q ? highlight(escapeHTML(h.title), q) : escapeHTML(h.title);
    return `
      <div class="chat-item ${h.id === activeId ? 'active' : ''}" data-id="${h.id}" tabindex="0">
        <span class="chat-item-title">${title}</span>
        <button class="chat-item-more" aria-label="More options">⋯</button>
      </div>`;
  }

  function highlight(text, q) {
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return text.slice(0, idx) + '<mark>' + text.slice(idx, idx + q.length) + '</mark>' + text.slice(idx + q.length);
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ============================= CONTEXT MENU ============================= */
  let ctxTargetId = null;
  function openContextMenu(anchorBtn, id) {
    ctxTargetId = id;
    const rect = anchorBtn.getBoundingClientRect();
    const menu = el.contextMenu;
    menu.hidden = false;
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.left = `${Math.min(rect.left, window.innerWidth - 190)}px`;
    const item = history.find(h => h.id === id);
    el.ctxPin.textContent = item?.pinned ? '📌 Unpin topic' : '📌 Pin topic';
  }
  function closeContextMenu() { el.contextMenu.hidden = true; ctxTargetId = null; }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#contextMenu') && !e.target.closest('.chat-item-more')) closeContextMenu();
  });

  /* ============================= TOPIC GENERATION ============================= */
  async function generateTopic(topicText) {
    const topic = (topicText ?? el.topicInput.value).trim();
    if (!topic) return;
    if (topic.length > 500) {
      showToast('Please keep topics under 500 characters.');
      return;
    }

    el.topicInput.value = '';
    autoResizeTextarea();
    updateCharHint();
    showLoading(true);

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      const markdown = data.markdown || data.content || '';
      if (!markdown) throw new Error('Empty response from AI service.');

      const record = {
        id: 'note_' + Date.now(),
        title: topic,
        markdown,
        pinned: false,
        createdAt: Date.now(),
      };
      history.unshift(record);
      saveHistory();
      renderHistoryLists(el.historySearch.value);
      loadTopic(record.id, true);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Something went wrong. Please try again.');
    } finally {
      showLoading(false);
    }
  }

  function showLoading(isLoading) {
    el.loadingPanel.hidden = !isLoading;
    el.generateBtn.disabled = isLoading;
    if (isLoading) {
      el.heroSection.style.display = 'none';
      let i = 0;
      let progress = 6;
      el.loadingText.textContent = LOADING_MESSAGES[0];
      el.progressFill.style.width = progress + '%';
      loadingInterval = setInterval(() => {
        i = (i + 1) % LOADING_MESSAGES.length;
        el.loadingText.textContent = LOADING_MESSAGES[i];
        progress = Math.min(progress + Math.random() * 14 + 6, 92);
        el.progressFill.style.width = progress + '%';
      }, 1000);
    } else {
      clearInterval(loadingInterval);
      el.progressFill.style.width = '100%';
      setTimeout(() => { el.progressFill.style.width = '0%'; }, 400);
    }
  }

  function loadTopic(id, freshlyGenerated = false) {
    const record = history.find(h => h.id === id);
    if (!record) return;
    activeId = id;
    el.heroSection.style.display = 'none';
    renderHistoryLists(el.historySearch.value);
    renderNote(record, freshlyGenerated);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ============================= RENDER NOTE AS CARDS ============================= */
  function renderNote(record, animateTyping) {
    const parsed = splitIntoSections(record.markdown);
    const dateStr = new Date(record.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

    const cardsHTML = parsed.map((sec, idx) => `
      <article class="note-card glass-panel" style="animation-delay:${idx * 60}ms">
        <h3 class="note-card-title"><span class="note-card-emoji">${sec.emoji}</span>${escapeHTML(sec.title)}</h3>
        <div class="note-card-body">${renderMarkdown(sec.body)}</div>
      </article>
    `).join('');

    el.responseFeed.innerHTML = `
      <div class="topic-block">
        <h2 class="topic-heading">${escapeHTML(record.title)}</h2>
        <p class="topic-meta">Generated ${dateStr} · ${parsed.length} sections</p>
        <div class="toolbar">
          <button class="tool-btn" data-tool="copy">📋 Copy</button>
          <button class="tool-btn" data-tool="pdf">⬇️ PDF</button>
          <button class="tool-btn" data-tool="txt">⬇️ TXT</button>
          <button class="tool-btn" data-tool="md">⬇️ Markdown</button>
          <button class="tool-btn" data-tool="share">🔗 Share</button>
          <button class="tool-btn" data-tool="speak">🔊 Speak</button>
          <button class="tool-btn" data-tool="regenerate">♻️ Regenerate</button>
          <button class="tool-btn tool-danger" data-tool="delete">🗑️ Delete</button>
        </div>
        <div class="card-grid">${cardsHTML}</div>
      </div>
    `;

    bindToolbar(record);
  }

  function bindToolbar(record) {
    $$('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => handleTool(btn.dataset.tool, record));
    });
  }

  function handleTool(tool, record) {
    switch (tool) {
      case 'copy':
        navigator.clipboard.writeText(record.markdown)
          .then(() => showToast('Copied to clipboard'))
          .catch(() => showToast('Could not copy — try selecting manually'));
        break;
      case 'pdf':
        exportAsPDF(record);
        break;
      case 'txt':
        downloadBlob(stripMarkdown(record.markdown), `${slugify(record.title)}.txt`, 'text/plain');
        showToast('Downloaded as TXT');
        break;
      case 'md':
        downloadBlob(record.markdown, `${slugify(record.title)}.md`, 'text/markdown');
        showToast('Downloaded as Markdown');
        break;
      case 'share':
        shareNote(record);
        break;
      case 'speak':
        toggleSpeech(record);
        break;
      case 'regenerate':
        generateTopic(record.title);
        break;
      case 'delete':
        deleteTopic(record.id);
        break;
    }
  }

  function exportAsPDF(record) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { showToast('Please allow pop-ups to export as PDF'); return; }
    const bodyHTML = splitIntoSections(record.markdown)
      .map(sec => `<h2>${sec.emoji} ${escapeHTML(sec.title)}</h2>${renderMarkdown(sec.body)}`)
      .join('');
    printWindow.document.write(`
      <html><head><title>${escapeHTML(record.title)}</title>
      <style>
        body{font-family:-apple-system,Segoe UI,sans-serif;color:#1a1a1a;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.6;}
        h1{font-size:26px;margin-bottom:4px;} h2{font-size:18px;margin-top:26px;border-bottom:2px solid #7C5CFC;padding-bottom:6px;}
        table{border-collapse:collapse;width:100%;} td,th{border:1px solid #ccc;padding:8px;} pre{background:#f4f4f7;padding:12px;border-radius:8px;overflow-x:auto;}
        code{background:#f0f0f4;padding:1px 5px;border-radius:4px;}
      </style></head>
      <body><h1>${escapeHTML(record.title)}</h1><p style="color:#777;font-size:13px;">StudySpark AI Pro — ${new Date(record.createdAt).toLocaleDateString()}</p>${bodyHTML}
      <script>window.onload = () => window.print();<\/script>
      </body></html>
    `);
    printWindow.document.close();
  }

  function shareNote(record) {
    const shareData = { title: record.title, text: stripMarkdown(record.markdown).slice(0, 400) };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareData.text).then(() => showToast('Summary copied — paste it anywhere to share'));
    }
  }

  function toggleSpeech(record) {
    if (!('speechSynthesis' in window)) { showToast('Speech synthesis is not supported in this browser'); return; }
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      showToast('Stopped reading');
      return;
    }
    speechUtterance = new SpeechSynthesisUtterance(stripMarkdown(record.markdown));
    speechUtterance.rate = 1;
    speechSynthesis.speak(speechUtterance);
    showToast('Reading notes aloud…');
  }

  function deleteTopic(id) {
    history = history.filter(h => h.id !== id);
    saveHistory();
    renderHistoryLists(el.historySearch.value);
    if (activeId === id) {
      activeId = null;
      el.responseFeed.innerHTML = '';
      el.heroSection.style.display = '';
    }
    showToast('Topic deleted');
  }

  /* ============================= MARKDOWN → SECTION SPLIT ============================= */
  function splitIntoSections(markdown) {
    // Split on markdown headings (## Heading or lines that are just an emoji + title)
    const lines = markdown.split(/\r?\n/);
    const blocks = [];
    let current = null;

    const headingRegex = /^#{1,3}\s*(.*)$/;

    lines.forEach(line => {
      const m = line.match(headingRegex);
      if (m && m[1].trim()) {
        if (current) blocks.push(current);
        current = { rawTitle: m[1].trim(), body: [] };
      } else if (current) {
        current.body.push(line);
      } else {
        // content before first heading — treat as a general summary block
        current = { rawTitle: 'Summary', body: [line] };
      }
    });
    if (current) blocks.push(current);

    if (blocks.length === 0) {
      return [{ emoji: '📖', title: 'Summary', body: markdown }];
    }

    return blocks.map(b => {
      const match = SECTIONS.find(s =>
        b.rawTitle.toLowerCase().includes(s.title.toLowerCase().split(' ')[0].toLowerCase()) ||
        b.rawTitle.toLowerCase().replace(/[^a-z]/g, '').includes(s.key));
      const cleanTitle = b.rawTitle.replace(/^[^\w]+/, '').trim();
      return {
        emoji: match ? match.emoji : extractEmoji(b.rawTitle) || '📝',
        title: cleanTitle || (match ? match.title : 'Notes'),
        body: b.body.join('\n').trim(),
      };
    }).filter(sec => sec.body.length > 0);
  }

  function extractEmoji(str) {
    const m = str.match(/^([\p{Emoji}\u200d\uFE0F]+)/u);
    return m ? m[1] : null;
  }

  /* ============================= LIGHTWEIGHT MARKDOWN RENDERER ============================= */
  function renderMarkdown(md) {
    if (!md) return '';
    let text = escapeHTML(md);

    // Code blocks ```
    text = text.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);

    // Tables (GFM pipe tables)
    text = text.replace(/((?:^\|.*\|\s*$\n?)+)/gm, (block) => {
      const rows = block.trim().split('\n').filter(r => r.trim());
      if (rows.length < 2 || !/^\|?\s*:?-+:?\s*\|/.test(rows[1])) return block;
      const toCells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = toCells(rows[0]);
      const bodyRows = rows.slice(2).map(toCells);
      let html = '<table><thead><tr>' + head.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
      bodyRows.forEach(r => { html += '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>'; });
      html += '</tbody></table>';
      return html;
    });

    // Blockquotes
    text = text.replace(/^&gt;\s?(.*)$/gm, '<blockquote>$1</blockquote>');

    // Headings within body (h4-h6 fallback, since h1-3 already used to split)
    text = text.replace(/^#{4,6}\s*(.*)$/gm, '<h3>$1</h3>');

    // Bold / italic / inline code
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Lists (unordered / ordered) — group consecutive list lines
    const lines = text.split('\n');
    let out = [];
    let listBuffer = [];
    let listType = null;

    const flushList = () => {
      if (listBuffer.length) {
        out.push(`<${listType}>${listBuffer.join('')}</${listType}>`);
        listBuffer = [];
        listType = null;
      }
    };

    lines.forEach(line => {
      const ulMatch = line.match(/^\s*[-*•]\s+(.*)$/);
      const olMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (ulMatch) {
        if (listType && listType !== 'ul') flushList();
        listType = 'ul';
        listBuffer.push(`<li>${ulMatch[1]}</li>`);
      } else if (olMatch) {
        if (listType && listType !== 'ol') flushList();
        listType = 'ol';
        listBuffer.push(`<li>${olMatch[1]}</li>`);
      } else {
        flushList();
        out.push(line);
      }
    });
    flushList();
    text = out.join('\n');

    // Paragraphs: wrap remaining plain lines, preserve pre/table/list/blockquote blocks
    const blockTags = /^\s*<(table|ul|ol|pre|blockquote|h[1-6])/;
    text = text
      .split(/\n{2,}/)
      .map(chunk => {
        const trimmed = chunk.trim();
        if (!trimmed) return '';
        if (blockTags.test(trimmed)) return trimmed;
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
      })
      .join('\n');

    return text;
  }

  function stripMarkdown(md) {
    return md
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[#>*_`]/g, '')
      .replace(/\|/g, ' ')
      .trim();
  }

  function downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function slugify(str) {
    return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'study-notes';
  }

  /* ============================= TOAST ============================= */
  let toastTimer = null;
  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2600);
  }

  /* ============================= EVENTS ============================= */
  function bindEvents() {
    // Generate
    el.generateBtn.addEventListener('click', (e) => {
      spawnRipple(e);
      generateTopic();
    });
    el.topicInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generateTopic(); }
    });
    el.topicInput.addEventListener('input', () => { autoResizeTextarea(); updateCharHint(); });

    // Hero chips
    $$('.chip').forEach(chip => chip.addEventListener('click', () => generateTopic(chip.dataset.topic)));

    // New chat
    el.newChatBtn.addEventListener('click', () => {
      activeId = null;
      el.responseFeed.innerHTML = '';
      el.heroSection.style.display = '';
      el.topicInput.focus();
      closeSidebarMobile();
      renderHistoryLists(el.historySearch.value);
    });

    // Sidebar search
    el.historySearch.addEventListener('input', () => renderHistoryLists(el.historySearch.value));
    el.globalSearch.addEventListener('input', () => renderHistoryLists(el.globalSearch.value));

    // Sidebar toggle (mobile)
    el.sidebarToggle.addEventListener('click', () => {
      el.sidebar.classList.toggle('open');
      el.sidebarScrim.classList.toggle('show');
    });
    el.sidebarScrim.addEventListener('click', closeSidebarMobile);

    // Clear history
    el.clearHistoryBtn.addEventListener('click', clearAllHistory);
    el.settingsClearBtn.addEventListener('click', clearAllHistory);

    // Dark mode
    el.darkModeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });

    // Settings modal
    el.settingsBtn.addEventListener('click', () => {
      el.settingsOverlay.style.display = "flex";
    }); 
    el.closeSettings.addEventListener('click', () => {
      el.settingsOverlay.style.display = "none";
    });
    el.settingsOverlay.addEventListener('click', (e) => {
      if (e.target === el.settingsOverlay) {
        el.settingsOverlay.style.display = "none";
      }
    });
    $$('#themeSegmented .seg-btn').forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.themeChoice)));
    $$('#fontSegmented .seg-btn').forEach(b => b.addEventListener('click', () => applyFontSize(b.dataset.fontChoice)));
    el.exportHistoryBtn.addEventListener('click', () => {
      downloadBlob(JSON.stringify(history, null, 2), 'studyspark-history-backup.json', 'application/json');
      showToast('History exported');
    });

    // Context menu actions
    el.contextMenu.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (!action || !ctxTargetId) return;
      handleContextAction(action, ctxTargetId);
      closeContextMenu();
    });

    // Keyboard shortcut: "/" focuses global search
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        el.globalSearch.focus();
      }
      if (e.key === 'Escape') { el.settingsOverlay.hidden = true; closeContextMenu(); }
    });
  }

  function closeSidebarMobile() {
    el.sidebar.classList.remove('open');
    el.sidebarScrim.classList.remove('show');
  }

  function clearAllHistory() {
    if (!history.length) { showToast('History is already empty'); return; }
    if (!confirm('Delete all saved topics? This cannot be undone.')) return;
    history = [];
    saveHistory();
    activeId = null;
    el.responseFeed.innerHTML = '';
    el.heroSection.style.display = '';
    renderHistoryLists();
    el.settingsOverlay.hidden = true;
    showToast('History cleared');
  }

  function handleContextAction(action, id) {
    const item = history.find(h => h.id === id);
    if (!item) return;
    if (action === 'pin') {
      item.pinned = !item.pinned;
      saveHistory();
      renderHistoryLists(el.historySearch.value);
      showToast(item.pinned ? 'Pinned' : 'Unpinned');
    } else if (action === 'rename') {
      const newTitle = prompt('Rename topic', item.title);
      if (newTitle && newTitle.trim()) {
        item.title = newTitle.trim();
        saveHistory();
        renderHistoryLists(el.historySearch.value);
        if (activeId === id) renderNote(item);
        showToast('Renamed');
      }
    } else if (action === 'delete') {
      deleteTopic(id);
    }
  }

  function autoResizeTextarea() {
    el.topicInput.style.height = 'auto';
    el.topicInput.style.height = Math.min(el.topicInput.scrollHeight, 160) + 'px';
  }

  function updateCharHint() {
    const len = el.topicInput.value.length;
    el.charHint.textContent = `${len} / 500`;
    el.charHint.style.color = len > 500 ? 'var(--danger)' : '';
  }

  function spawnRipple(e) {
    const btn = e.currentTarget;
    const circle = document.createElement('span');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    circle.className = 'ripple';
    circle.style.width = circle.style.height = size + 'px';
    circle.style.left = (e.clientX - rect.left - size / 2) + 'px';
    circle.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(circle);
    setTimeout(() => circle.remove(), 650);
  }

  /* ============================= BOOT ============================= */
  document.addEventListener('DOMContentLoaded', init);
})();
