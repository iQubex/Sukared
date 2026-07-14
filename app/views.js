(function () {
    'use strict';

    const { el, toast, confirm, openModal, closeModal, customSelect } = window.SukaRedUI;
    const formatBytes = value => {
        if (value == null) return '-';
        const size = Number(value) || 0;
        if (size < 1024) return `${size} B`;
        if (size < 1048576) return `${(size / 1024).toFixed(size < 10240 ? 1 : 0)} KB`;
        return `${(size / 1048576).toFixed(1)} MB`;
    };
    const formatDate = value => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
    const downloadText = (filename, value, type = 'text/plain') => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([value], { type }));
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 0);
    };
    const heading = (eyebrow, title, subtitle, badge) => {
        const root = el('header', 'page-heading');
        const copy = el('div');
        copy.append(el('span', 'eyebrow', eyebrow), el('h1', '', title), el('p', '', subtitle));
        root.append(copy);
        if (badge) root.append(el('span', 'page-badge', badge));
        return root;
    };
    const setPage = (outlet, node) => { outlet.replaceChildren(node); };

    const historyCard = (record, store, refresh) => {
        const card = el('article', `history-card status-${record.status}`);
        const top = el('div', 'history-card-top');
        const title = el('div');
        title.append(el('h3', '', record.sourceName), el('span', 'history-date', formatDate(record.createdAt)));
        top.append(title, el('span', `status-badge status-${record.status}`, record.status === 'timeout' ? 'Timeout' : record.status[0].toUpperCase() + record.status.slice(1)));
        const facts = el('dl', 'history-facts');
        [
            ['Profile', record.profile], ['Build ID', record.buildId || 'Pending'], ['Input', formatBytes(record.sourceBytes)],
            ['Output', formatBytes(record.outputBytes)], ['Build Time', record.buildTimeMs == null ? '-' : `${record.buildTimeMs} ms`],
            ['Coverage', record.coveragePercent == null ? '-' : `${record.coveragePercent}%`],
            ...(record.errorCode ? [['Error', record.errorCode]] : [])
        ].forEach(([label, value]) => { const item = el('div'); item.append(el('dt', '', label), el('dd', '', value)); facts.append(item); });
        const actions = el('div', 'card-actions');
        const action = (label, handler, disabled = false) => {
            const button = el('button', 'text-button', label); button.type = 'button'; button.disabled = disabled; button.addEventListener('click', handler); actions.append(button);
        };
        action('View Details', () => window.sukaredApp.router.navigate(`/history/${encodeURIComponent(record.id)}`));
        action('Copy Build ID', async () => { await navigator.clipboard.writeText(record.buildId || record.id); toast('Build ID copied', 'success'); });
        if (record.outputAvailable) {
            action('Copy Output', async () => { await navigator.clipboard.writeText(record.outputText); toast('Output copied', 'success'); });
            action('Download Output', () => downloadText(`${record.sourceName.replace(/\.(lua|luau)$/i, '')}.sukared.lua`, record.outputText));
        }
        action('Rename', () => {
            const wrap = el('label', 'field-row');
            wrap.append(el('span', '', 'Script name'));
            const input = document.createElement('input'); input.className = 'text-control'; input.value = record.sourceName; input.maxLength = 180; wrap.append(input);
            openModal({ title: 'Rename Entry', content: wrap, actions: [
                { label: 'Cancel', onClick: closeModal },
                { label: 'Save', primary: true, onClick: async () => { if (input.value.trim()) await store.update(record.id, { sourceName: input.value.trim() }); closeModal(); toast('History entry renamed', 'success'); refresh(); } }
            ] });
        });
        action('Delete', async () => { if (await confirm('Delete history entry?', 'This removes local metadata and any retained output.')) { await store.delete(record.id); toast('History entry deleted', 'success'); refresh(); } });
        card.append(top, facts, actions);
        return card;
    };

    const groupLabel = createdAt => {
        const date = new Date(createdAt); const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diff = Math.round((start - day) / 86400000);
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Yesterday';
        if (diff <= 7) return 'Previous 7 Days';
        return 'Older';
    };

    const history = async ({ outlet, store }) => {
        const page = el('section', 'content-page page-section');
        page.append(heading('Local Workspace', 'Build History', 'Builds are stored locally in this browser.', 'Local Only'));
        const controls = el('div', 'history-controls');
        const search = document.createElement('input'); search.className = 'text-control search-control'; search.placeholder = 'Search scripts, Build IDs or errors'; search.setAttribute('aria-label', 'Search history');
        let renderList = async () => {};
        const profile = customSelect('', ['All Profiles', 'Light', 'Light+', 'Good', 'Pro'].map(label => ({ value: label === 'All Profiles' ? '' : label, label })), () => renderList(), 'Filter by profile');
        const status = customSelect('', ['All Statuses', 'completed', 'failed', 'timeout', 'cancelled', 'building'].map(value => ({ value: value.startsWith('All') ? '' : value, label: value.startsWith('All') ? value : value[0].toUpperCase() + value.slice(1) })), () => renderList(), 'Filter by status');
        const sort = customSelect('newest', [{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }], () => renderList(), 'Sort history');
        controls.append(search, profile.element, status.element, sort.element);
        const management = el('div', 'history-management');
        const importInput = document.createElement('input'); importInput.type = 'file'; importInput.accept = 'application/json,.json'; importInput.hidden = true;
        const button = (label, handler) => { const item = el('button', 'button', label); item.type = 'button'; item.addEventListener('click', handler); return item; };
        management.append(
            button('Export Metadata', async () => downloadText('sukared-history-metadata.json', JSON.stringify(await store.exportMetadata(), null, 2), 'application/json')),
            button('Import Metadata', () => importInput.click()), importInput,
            button('History Settings', () => window.sukaredApp.router.navigate('/settings?section=history')),
            button('Clear History', async () => { if (await confirm('Clear all history?', 'This permanently removes local history and retained outputs.')) { await store.clearAll(); toast('History cleared', 'success'); renderList(); } })
        );
        const list = el('div', 'history-list');
        page.append(controls, management, list);
        setPage(outlet, page);

        importInput.addEventListener('change', async () => {
            try { const payload = JSON.parse(await importInput.files[0].text()); const count = await store.importMetadata(payload); toast(`${count} history entries imported`, 'success'); renderList(); }
            catch (error) { toast(error.message || 'History import failed', 'error'); }
        });
        renderList = async () => {
            const query = search.value.trim().toLowerCase();
            let records = await store.list();
            records = records.filter(item => (!query || [item.sourceName, item.buildId, item.errorCode].some(value => String(value || '').toLowerCase().includes(query)))
                && (!profile.value || item.profile === profile.value) && (!status.value || item.status === status.value));
            if (sort.value === 'oldest') records.reverse();
            list.replaceChildren();
            if (!records.length) {
                const empty = el('div', 'empty-state');
                empty.append(el('h2', '', 'No build history yet'), el('p', '', 'Your completed and failed builds will appear here. History is stored locally in this browser.'));
                const start = el('a', 'button button-primary', 'Start Obfuscating'); start.href = '/dashboard'; start.dataset.route = ''; empty.append(start); list.append(empty); return;
            }
            const groups = new Map();
            records.forEach(record => { const label = groupLabel(record.createdAt); if (!groups.has(label)) groups.set(label, []); groups.get(label).push(record); });
            groups.forEach((items, label) => {
                const section = el('section', 'history-group'); section.append(el('h2', '', label));
                const grid = el('div', 'history-grid'); items.forEach(record => grid.append(historyCard(record, store, renderList))); section.append(grid); list.append(section);
            });
        };
        search.addEventListener('input', renderList);
        await renderList();
    };

    const historyDetail = async ({ outlet, store, id }) => {
        const record = await store.get(id);
        if (!record) return notFound({ outlet });
        const page = el('section', 'content-page page-section detail-page');
        const back = el('a', 'back-link', '← Build History'); back.href = '/history'; back.dataset.route = '';
        page.append(back, heading('Build Record', record.sourceName, 'Local metadata for this build.', record.status.toUpperCase()));
        const facts = el('dl', 'detail-grid');
        const fields = [
            ['Build ID', record.buildId || record.id], ['Timestamp', formatDate(record.createdAt)], ['Status', record.status], ['Profile', record.profile],
            ['Input Size', formatBytes(record.sourceBytes)], ['Output Size', formatBytes(record.outputBytes)], ['Build Duration', record.buildTimeMs == null ? '-' : `${record.buildTimeMs} ms`],
            ['VM Applied', record.vmApplied == null ? '-' : record.vmApplied ? 'Yes' : 'No'], ['Function Coverage', record.coveragePercent == null ? '-' : `${record.coveragePercent}%`],
            ['AST Coverage', record.astCoveragePercent == null ? '-' : `${record.astCoveragePercent}%`], ['Runtime', record.runtimeVersion || '-'],
            ['Error Code', record.errorCode || '-'], ['Failure Stage', record.failureStage || '-'], ['Credits Charged', 'No']
        ];
        fields.forEach(([label, value]) => { const item = el('div'); item.append(el('dt', '', label), el('dd', '', String(value))); facts.append(item); });
        page.append(facts);
        if (record.errorMessage) { const error = el('section', 'safe-error'); error.append(el('h2', '', 'Error Information'), el('p', '', record.errorMessage)); page.append(error); }
        const details = document.createElement('details'); details.className = 'technical-details standalone'; details.append(el('summary', '', 'Technical Metadata'));
        const pre = el('pre'); pre.textContent = JSON.stringify(record.metadata || {}, null, 2); details.append(pre); page.append(details);
        setPage(outlet, page);
    };

    const pricing = ({ outlet }) => {
        const page = el('section', 'content-page page-section');
        page.append(heading('Plans', 'Pricing', 'Credits are disabled during the public beta.', 'Coming Soon'));
        page.append(el('p', 'beta-notice', 'Current builds do not consume credits.'));
        const grid = el('div', 'pricing-grid');
        [['Light', 1, '⚡'], ['Light+', 2, '✨'], ['Good', 10, '🛡'], ['Pro', 50, '🧪'], ['Hell', 200, '🔥'], ['Blatant', 500, '☠'], ['Fatality', 1000, '👑']].forEach(([name, credits, icon]) => {
            const card = el('article', 'pricing-card is-locked'); card.append(el('span', 'pricing-icon', icon), el('h2', '', name), el('strong', 'price', `${credits} credit${credits === 1 ? '' : 's'}`), el('p', '', 'Purchasing is unavailable during beta.'));
            const action = el('button', 'button', 'Coming Soon'); action.disabled = true; card.append(action); grid.append(card);
        });
        page.append(grid); setPage(outlet, page);
    };

    const credits = ({ outlet }) => {
        const page = el('section', 'content-page page-section'); page.append(heading('Wallet', 'Credits', 'Static beta access information.', 'BETA ACCESS'));
        const balance = el('section', 'balance-panel'); balance.append(el('span', '', 'Current Balance'), el('strong', '', '0 Credits'), el('p', '', 'Credits are disabled during the public beta. Current profiles do not consume credits.'));
        const transactions = el('section', 'plain-section'); transactions.append(el('h2', '', 'Recent Transactions'), el('p', 'muted', 'No transactions yet.'));
        page.append(balance, transactions); setPage(outlet, page);
    };

    const changelog = ({ outlet }) => {
        const page = el('section', 'content-page page-section'); page.append(heading('Product Updates', 'Changelog', 'What changed across SukaRed releases.'));
        const entries = [
            { version: 'SukaRed 1.0 Beta', date: 'July 2026', status: 'Current', changes: ['New multi-page dashboard', 'Persistent local build history', 'Profile settings redesign', 'Build Summary simplification', 'Native Luau runtime support', 'Production worker isolation', 'Good profile compatibility improvements', 'Pro experimental profile', 'Public beta privacy safeguards'] },
            { version: 'Earlier Development', date: '2026', status: 'Archive', changes: ['Initial VM integration', 'Closure and upvalue support', 'Mixed interpreter families', 'Shared interpreter clusters', 'Stress and fuzz testing'] }
        ];
        const timeline = el('div', 'changelog-list');
        entries.forEach(entry => { const card = el('article', 'changelog-card'); const top = el('div', 'changelog-top'); top.append(el('div', '', null), el('span', 'status-badge', entry.status)); top.firstChild.append(el('h2', '', entry.version), el('time', '', entry.date)); const list = el('ul'); entry.changes.forEach(change => list.append(el('li', '', change))); card.append(top, list); timeline.append(card); });
        page.append(timeline); setPage(outlet, page);
    };

    const profile = ({ outlet }) => {
        const page = el('section', 'content-page page-section centered-page');
        const panel = el('section', 'placeholder-panel'); panel.append(el('span', 'avatar-placeholder', 'G'), el('h1', '', 'Guest User'), el('span', 'page-badge', 'BETA'), el('h2', '', 'Coming Soon'), el('p', '', 'Accounts and cloud synchronization are not available during the public beta.'));
        const disabled = el('div', 'disabled-actions'); ['Login', 'Register', 'Cloud History', 'API Keys'].forEach(label => { const button = el('button', 'button', label); button.disabled = true; disabled.append(button); }); panel.append(disabled); page.append(panel); setPage(outlet, page);
    };

    const settings = ({ outlet, store }) => {
        let draft = window.SukaRedSettings.load();
        const page = el('section', 'content-page page-section'); page.append(heading('Preferences', 'Settings', 'Protection, editor and local history preferences.'));
        page.append(window.SukaRedUI.settingsContent(draft, value => { draft = value; }));
        const save = el('button', 'button button-primary', 'Save Settings'); save.type = 'button'; save.addEventListener('click', async () => { window.SukaRedSettings.save(draft); document.body.classList.toggle('animations-off', !draft.animations); await store.prune(); toast('Settings saved', 'success'); });
        const danger = el('section', 'settings-section danger-zone'); danger.append(el('h3', '', 'History Management'));
        const actions = el('div', 'card-actions');
        [['Clear completed builds', ['completed']], ['Clear failed builds', ['failed', 'timeout']], ['Clear all history', null]].forEach(([label, statuses]) => { const button = el('button', 'button', label); button.type = 'button'; button.addEventListener('click', async () => { if (await confirm(`${label}?`, 'This action permanently removes local records and retained outputs.')) { statuses ? await store.clearByStatus(statuses) : await store.clearAll(); toast('History updated', 'success'); } }); actions.append(button); });
        danger.append(actions); page.append(save, danger); setPage(outlet, page);
    };

    const notFound = ({ outlet }) => {
        const page = el('section', 'content-page page-section centered-page'); const panel = el('section', 'placeholder-panel'); panel.append(el('span', 'error-code', '404'), el('h1', '', 'Page not found'), el('p', '', 'The page you requested does not exist.')); const link = el('a', 'button button-primary', 'Return to Dashboard'); link.href = '/dashboard'; link.dataset.route = ''; panel.append(link); page.append(panel); setPage(outlet, page);
    };

    window.SukaRedViews = { history, historyDetail, pricing, credits, changelog, profile, settings, notFound };
})();
