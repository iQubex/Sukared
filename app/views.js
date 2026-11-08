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
            ['Build ID', record.buildId || 'Pending'], ['Input', formatBytes(record.sourceBytes)],
            ['Output', formatBytes(record.outputBytes)], ['Build Time', record.buildTimeMs == null ? '-' : `${record.buildTimeMs} ms`],
            ...(record.errorCode ? [['Error', record.errorCode]] : [])
        ].forEach(([label, value]) => { const item = el('div'); item.append(el('dt', '', label), el('dd', '', value)); facts.append(item); });
        const actions = el('div', 'card-actions');
        const action = (label, handler, disabled = false) => {
            const button = el('button', 'text-button', label); button.type = 'button'; button.disabled = disabled; button.addEventListener('click', handler); actions.append(button);
        };
        action('View Details', () => window.sukaredApp.router.navigate(`/history/${encodeURIComponent(record.id)}`));
        action('Copy Build ID', async () => { await navigator.clipboard.writeText(record.buildId || record.id); toast('Build ID copied', 'success'); });
        action('Delete', async () => { if (await confirm('Delete history entry?', 'This removes this account metadata record.')) { await store.delete(record.id); toast('History entry deleted', 'success'); refresh(); } });
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

    const legacyHistory = async ({ outlet, store }) => {
        const page = el('section', 'content-page page-section luavex-history-page');
        page.append(heading('Account', 'Build History', 'Private metadata for builds completed by your Discord account.', 'Metadata Only'));
        if (!window.LuavexAuth.state.authenticated) {
            const empty = el('div', 'empty-state');
            empty.append(el('h2', '', 'Connect Discord to view history'), el('p', '', 'Source code and protected output are never stored in account history.'));
            const connect = el('button', 'button button-primary', 'Connect Discord'); connect.type = 'button'; connect.addEventListener('click', window.LuavexAuth.login); empty.append(connect);
            page.append(empty); setPage(outlet, page); return;
        }
        const controls = el('div', 'history-controls');
        const search = document.createElement('input'); search.className = 'text-control search-control'; search.placeholder = 'Search scripts, Build IDs or errors'; search.setAttribute('aria-label', 'Search history');
        let renderList = async () => {};
        const status = customSelect('', ['All Statuses', 'completed', 'failed', 'timeout', 'cancelled', 'building'].map(value => ({ value: value.startsWith('All') ? '' : value, label: value.startsWith('All') ? value : value[0].toUpperCase() + value.slice(1) })), () => renderList(), 'Filter by status');
        const sort = customSelect('newest', [{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }], () => renderList(), 'Sort history');
        controls.append(search, status.element, sort.element);
        const management = el('div', 'history-management');
        const button = (label, handler) => { const item = el('button', 'button', label); item.type = 'button'; item.addEventListener('click', handler); return item; };
        management.append(
            button('Export Metadata', async () => downloadText('luavex-history-metadata.json', JSON.stringify(await store.exportMetadata(), null, 2), 'application/json')),
            button('Clear History', async () => { if (await confirm('Clear all history?', 'This permanently removes your account metadata records.')) { await store.clearAll(); toast('History cleared', 'success'); renderList(); } })
        );
        const list = el('div', 'history-list');
        page.append(controls, management, list);
        setPage(outlet, page);

        renderList = async () => {
            const query = search.value.trim().toLowerCase();
            let records = await store.list();
            records = records.filter(item => (!query || [item.sourceName, item.buildId, item.errorCode].some(value => String(value || '').toLowerCase().includes(query)))
                && (!status.value || item.status === status.value));
            if (sort.value === 'oldest') records.reverse();
            list.replaceChildren();
            if (!records.length) {
                const empty = el('div', 'empty-state');
                empty.append(el('h2', '', 'No build history yet'), el('p', '', 'Completed and failed build metadata will appear here. Source and output are not retained.'));
                const start = el('a', 'button button-primary', 'Open Workspace'); start.href = '/#/workspace'; start.dataset.route = ''; empty.append(start); list.append(empty); return;
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

    const history = ({ outlet, store }) => {
        if (!window.LuavexAuth.state.authenticated) return legacyHistory({ outlet, store });
        const page = el('section', 'content-page page-section luavex-history-page');
        const title = heading('Account', 'Protected Scripts', 'Identify or delete your protected scripts.');
        const slots = el('small', 'hosted-slots');
        slots.setAttribute('role', 'status');
        const list = el('div', 'history-list', 'Loading protected scripts…');
        page.append(title, slots, list);
        setPage(outlet, page);
        const controller = new AbortController();
        const owner = window.LuavexAuth.state.account?.id;
        let revision = 0, hosted = false;
        const pending = new Set();
        const current = () => !controller.signal.aborted && page.parentNode === outlet && window.LuavexAuth.state.authenticated &&
            window.LuavexAuth.state.account?.id === owner;
        const problem = async error => {
            if (error.status === 401 || error.code === 'AUTH_REQUIRED') {
                await window.LuavexAuth.refresh();
                if (!controller.signal.aborted && page.parentNode === outlet) {
                    slots.textContent = '';
                    list.replaceChildren(el('p', '', 'Your session expired. Connect Discord to view protected scripts.'));
                    const connect = el('button', 'button button-primary', 'Connect Discord');
                    connect.type = 'button'; connect.addEventListener('click', window.LuavexAuth.login); list.append(connect);
                }
            } else if (current()) toast(error.message || 'Protected scripts could not be updated.', 'error');
        };
        const refresh = async () => {
            const request = ++revision;
            try {
                const result = await window.LuavexAPI.protectedScripts({ signal: controller.signal });
                if (!current() || request !== revision) return;
                if (!result && !hosted) { await legacyHistory({ outlet, store }); return; }
                if (!result) throw new Error('Protected scripts are unavailable.');
                hosted = true;
                slots.textContent = `Free Protection Slots: ${result.freeSlots.used} / ${result.freeSlots.limit}`;
                list.replaceChildren();
                if (!result.scripts.length) list.append(el('p', 'empty-state', 'No protected scripts yet.'));
                for (const record of result.scripts) {
                    const card = el('article', 'history-card protected-script-row');
                    const details = el('div');
                    details.append(el('h3', '', record.name), el('span', 'history-date', formatDate(record.createdAt)));
                    const remove = el('button', 'text-button', 'Delete');
                    remove.type = 'button'; remove.disabled = pending.has(record.id);
                    remove.setAttribute('aria-label', `Delete ${record.name}`);
                    remove.addEventListener('click', async () => {
                        if (!current() || pending.has(record.id)) return;
                        if (!await confirm(`Delete “${record.name}”?`,
                            'Deleting this protected script will disable future executions of its distributed output. Already-running scripts are not stopped.')) return;
                        if (!current() || pending.has(record.id)) return;
                        pending.add(record.id); remove.disabled = true;
                        try {
                            await window.LuavexAPI.request(`/protected-scripts/${encodeURIComponent(record.id)}`,
                                { method: 'DELETE', signal: controller.signal });
                            if (current()) { toast('Protected script deleted', 'success'); await refresh(); }
                        } catch (error) {
                            if (!current()) return;
                            if (error.status === 404) await refresh();
                            else await problem(error);
                        } finally {
                            pending.delete(record.id); remove.disabled = false;
                        }
                    });
                    card.append(details, el('span', 'status-badge', record.tier), remove);
                    list.append(card);
                }
            } catch (error) {
                if (!current() || request !== revision) return;
                if (error.status !== 401 && error.code !== 'AUTH_REQUIRED') {
                    slots.textContent = '';
                    list.replaceChildren(el('p', '', 'Protected scripts could not be loaded.'));
                    const retry = el('button', 'button', 'Retry'); retry.type = 'button'; retry.addEventListener('click', refresh); list.append(retry);
                }
                await problem(error);
            }
        };
        const unsubscribe = window.LuavexAuth.subscribe(auth => {
            if (page.parentNode !== outlet || (auth.authenticated && auth.account?.id === owner)) return;
            revision++; slots.textContent = '';
            list.replaceChildren(el('p', '', 'Your account session changed. Reopen History to continue.'));
        });
        void refresh();
        return () => { revision++; controller.abort(); unsubscribe(); };
    };

    const historyDetail = async ({ outlet, store, id }) => {
        const record = await store.get(id);
        if (!record) return notFound({ outlet });
        const page = el('section', 'content-page page-section detail-page luavex-history-page');
        const back = el('a', 'back-link', '← Build History'); back.href = '/#/history'; back.dataset.route = '';
        page.append(back, heading('Build Record', record.sourceName, 'Account metadata for this build. No source or output is retained.', record.status.toUpperCase()));
        const facts = el('dl', 'detail-grid');
        const fields = [
            ['Build ID', record.buildId || record.id], ['Timestamp', formatDate(record.createdAt)], ['Status', record.status],
            ['Input Size', formatBytes(record.sourceBytes)], ['Output Size', formatBytes(record.outputBytes)], ['Build Duration', record.buildTimeMs == null ? '-' : `${record.buildTimeMs} ms`],
            ['Error Code', record.errorCode || '-'], ['Failure Stage', record.failureStage || '-'], ['Credits Charged', 'No']
        ];
        fields.forEach(([label, value]) => { const item = el('div'); item.append(el('dt', '', label), el('dd', '', String(value))); facts.append(item); });
        page.append(facts);
        if (record.errorMessage) { const error = el('section', 'safe-error'); error.append(el('h2', '', 'Error Information'), el('p', '', record.errorMessage)); page.append(error); }
        setPage(outlet, page);
    };

    const pricing = ({ outlet }) => {
        const page = el('section', 'content-page page-section');
        page.append(heading('Plans', 'Pricing', 'Credits are disabled during the public beta.', 'Coming Soon'));
        page.append(el('p', 'beta-notice', 'Current builds do not consume credits.'));
        const grid = el('div', 'pricing-grid');
        [['Starter', 10, '⚡'], ['Builder', 50, '🛡'], ['Studio', 200, '✨']].forEach(([name, credits, icon]) => {
            const card = el('article', 'pricing-card is-locked'); card.append(el('span', 'pricing-icon', icon), el('h2', '', name), el('strong', 'price', `${credits} credits`), el('p', '', 'Purchasing is unavailable during beta.'));
            const action = el('button', 'button', 'Coming Soon'); action.disabled = true; card.append(action); grid.append(card);
        });
        page.append(grid); setPage(outlet, page);
    };

    const credits = ({ outlet }) => {
        const page = el('section', 'content-page page-section'); page.append(heading('Wallet', 'Credits', 'Static beta access information.', 'BETA ACCESS'));
        const balance = el('section', 'balance-panel'); balance.append(el('span', '', 'Current Balance'), el('strong', '', '0 Credits'), el('p', '', 'Credits are disabled during the public beta. Current builds do not consume credits.'));
        const transactions = el('section', 'plain-section'); transactions.append(el('h2', '', 'Recent Transactions'), el('p', 'muted', 'No transactions yet.'));
        page.append(balance, transactions); setPage(outlet, page);
    };

    const changelog = ({ outlet }) => {
        const page = el('section', 'content-page page-section changelog-page'); page.append(heading('Release Notes', 'Changelog', `What changed in Luavex. ${window.LuavexRelease.version} is the current release.`));
        const entries = window.SukaRedChangelog || [];
        const timeline = el('div', 'changelog-list');
        entries.forEach(entry => {
            const card = el('article', 'changelog-entry'); const top = el('header', 'changelog-top');
            card.dataset.release = entry.status;
            top.append(el('h2', '', entry.version), el('span', 'status-badge', entry.status)); card.append(top);
            if (entry.status === 'In development') card.append(el('p', 'release-plan-note', 'Planned for the next release.'));
            Object.entries(entry.groups).forEach(([group, changes]) => { const section = el('section', 'change-group'); section.append(el('h3', '', group)); const list = el('ul'); changes.forEach(change => list.append(el('li', '', change))); section.append(list); card.append(section); });
            timeline.append(card);
        });
        page.append(timeline); setPage(outlet, page);
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
        const page = el('section', 'content-page page-section centered-page'); const panel = el('section', 'placeholder-panel'); panel.append(el('span', 'error-code', '404'), el('h1', '', 'Page not found'), el('p', '', 'The page you requested does not exist.')); const link = el('a', 'button button-primary', 'Open Workspace'); link.href = '/#/workspace'; link.dataset.route = ''; panel.append(link); page.append(panel); setPage(outlet, page);
    };

    const storageRequest = (path, method, body) => window.LuavexAPI.request('/scripts' + path,
        { method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
    const routeLink = (text, href) => {
        const link = el('a', 'button', text);
        link.href = '/#' + href;
        link.dataset.route = '';
        return link;
    };
    const action = (text, run) => {
        const button = el('button', 'button', text);
        button.type = 'button';
        button.addEventListener('click', run);
        return button;
    };
    const nameDialog = ({ title, name, source, submit, done }) => {
        const dialog = el('dialog', 'storage-dialog');
        const form = el('form', 'storage-form');
        const label = el('label', '', 'Script name');
        const field = el('input', 'text-control');
        field.value = name; field.required = true; field.autocomplete = 'off';
        label.append(field);
        const include = el('input'); include.type = 'checkbox';
        if (source) {
            const option = el('label', 'storage-check');
            option.append(include, ' Save source');
            form.append(option);
        }
        const feedback = el('p', 'storage-feedback'); feedback.setAttribute('role', 'alert');
        const save = el('button', 'button button-primary', 'Save'); save.type = 'submit';
        const cancel = action('Cancel', () => dialog.close());
        const controls = el('div', 'card-actions'); controls.append(cancel, save);
        form.prepend(el('h2', '', title), label);
        form.append(feedback, controls); dialog.append(form);
        document.body.append(dialog);
        dialog.addEventListener('close', () => dialog.remove(), { once: true });
        dialog.addEventListener('cancel', event => { if (save.disabled) event.preventDefault(); });
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (save.disabled) return;
            const error = window.SukaRedDashboard.helpers.scriptNameError(field.value);
            if (error) { feedback.textContent = error; field.focus(); return; }
            save.disabled = true; cancel.disabled = true;
            try { const result = await submit(field.value.trim(), include.checked); dialog.close(); done(result); }
            catch (error) { feedback.textContent = error.message || 'Could not save script.'; }
            finally { save.disabled = false; cancel.disabled = false; }
        });
        dialog.showModal(); field.select();
    };
    const nameScript = (done, closed) => {
        const dialog = el('dialog', 'storage-dialog');
        const form = el('form', 'storage-form');
        const label = el('label', '', 'Script name');
        const field = el('input', 'text-control'); field.required = true; field.autocomplete = 'off'; label.append(field);
        const feedback = el('p', 'storage-feedback'); feedback.setAttribute('role', 'alert');
        const submit = el('button', 'button button-primary', 'Obfuscate'); submit.type = 'submit';
        const controls = el('div', 'card-actions'); controls.append(action('Cancel', () => dialog.close()), submit);
        form.append(el('h2', '', 'Name your script'), label, feedback, controls);
        dialog.append(form); document.body.append(dialog);
        dialog.addEventListener('close', () => { dialog.remove(); closed(); }, { once: true });
        form.addEventListener('submit', event => {
            event.preventDefault();
            const error = window.SukaRedDashboard.helpers.scriptNameError(field.value);
            if (error) { feedback.textContent = error; return; }
            dialog.close(); done(field.value.trim());
        });
        dialog.showModal(); field.focus();
    };
    const storagePage = (outlet, title) => {
        const page = el('section', 'content-page page-section storage-page');
        page.append(heading('Account', title, ''));
        setPage(outlet, page);
        const auth = window.LuavexAuth.state;
        if (!auth.authenticated) page.append(action('Connect Discord', window.LuavexAuth.login));
        else if (!auth.storageAvailable) page.append(el('p', '', 'Storage is not available.'));
        return auth.authenticated && auth.storageAvailable ? page : null;
    };
    const storage = async ({ outlet }) => {
        const page = storagePage(outlet, 'My Storage');
        if (!page) return;
        const filter = el('input', 'text-control'); filter.placeholder = 'Search scripts'; filter.setAttribute('aria-label', 'Search scripts');
        const sort = el('select', 'text-control'); sort.setAttribute('aria-label', 'Sort scripts');
        for (const [value, label] of [['updated','Recently updated'],['name','Name']]) {
            const option = el('option', '', label); option.value = value; sort.append(option);
        }
        const tools = el('div', 'history-controls'); tools.append(filter, sort);
        const usage = el('p', '', 'Loading scripts…');
        const list = el('div', 'history-list');
        page.append(usage, tools, list);
        let scripts = [];
        const refresh = async () => {
            const result = await storageRequest('');
            if (page.parentNode !== outlet) return;
            scripts = result.scripts;
            usage.textContent = formatBytes(result.usage.used) + ' used of ' + formatBytes(result.usage.limit);
            draw();
        };
        const draw = () => {
            const search = filter.value.trim().toLowerCase();
            const visible = scripts.filter(row => row.name.toLowerCase().includes(search));
            if (sort.value === 'name') visible.sort((a,b) => a.name.localeCompare(b.name));
            list.replaceChildren();
            if (!visible.length) list.append(el('p', 'empty-state', search ? 'No matching scripts.' : 'Save a build from Workspace to get started.'));
            for (const row of visible) {
                const card = el('article', 'history-card');
                const buttons = el('div', 'card-actions');
                const url = '/storage/' + encodeURIComponent(row.id);
                buttons.append(routeLink('Open', url));
                if (row.source_bytes) buttons.append(routeLink('View Source', url + '?file=source'));
                buttons.append(routeLink('View Output', url + '?file=output'), action('Download', async () => {
                    try {
                        const { script } = await storageRequest('/' + encodeURIComponent(row.id));
                        downloadText(script.name + '.luavex.lua', script.output);
                    } catch (error) { toast(error.message, 'error'); }
                }), action('Rename', () => nameDialog({
                    title: 'Rename script', name: row.name,
                    submit: name => storageRequest('/' + encodeURIComponent(row.id), 'PATCH', { name }),
                    done: () => void refresh().catch(error => toast(error.message, 'error'))
                })), action('Delete', async () => {
                    if (!await confirm('Delete this script?', 'Its saved files will be removed. Shared loaders remain active.')) return;
                    try { await storageRequest('/' + encodeURIComponent(row.id), 'DELETE'); await refresh(); }
                    catch (error) { toast(error.message, 'error'); }
                }));
                card.append(el('h2', '', row.name),
                    el('p', 'script-library-meta', [
                        row.created ? 'Created ' + formatDate(row.created) : null, 'Updated ' + formatDate(row.updated),
                        row.source_bytes ? 'Source + protected output' : 'Protected output', 'Saved', formatBytes(row.source_bytes + row.output_bytes)
                    ].filter(Boolean).join(' · ')), buttons);
                list.append(card);
            }
        };
        try {
            filter.addEventListener('input', draw); sort.addEventListener('change', draw);
            await refresh();
        } catch (error) { usage.textContent = error.message || 'Could not load scripts.'; }
    };
    const scriptDetails = async ({ outlet, params, query }) => {
        const page = storagePage(outlet, 'Script Details');
        if (!page) return;
        const key = '/' + encodeURIComponent(params.id);
        const feedback = el('p', 'storage-feedback'); feedback.setAttribute('role', 'status');
        page.append(routeLink('My Storage', '/storage'), feedback);
        try {
            const { script } = await storageRequest(key);
            if (page.parentNode !== outlet) return;
            const title = el('h2', '', script.name);
            const controls = el('div', 'card-actions');
            controls.append(action('Rename', () => nameDialog({
                title: 'Rename script', name: script.name,
                submit: name => storageRequest(key, 'PATCH', { name }),
                done: ({ script: updated }) => { script.name = updated.name; title.textContent = updated.name; }
            })));
            if (script.source !== null) controls.append(action('Open in Workspace', () => {
                window.SukaRedDashboard.openStored(script);
                window.sukaredApp.router.navigate('/workspace');
            }));
            controls.append(action('Delete', async () => {
                if (!await confirm('Delete this script?', 'This removes its saved files. Shared loaders remain active.')) return;
                try { await storageRequest(key, 'DELETE'); window.sukaredApp.router.navigate('/storage'); }
                catch (error) { feedback.textContent = error.message; }
            }));
            const fileTabs = el('div', 'card-actions');
            const viewer = el('div', 'script-viewer');
            const fallback = el('pre', 'script-fallback');
            const host = el('div', 'script-monaco'); host.hidden = true;
            viewer.append(host, fallback);
            let kind = script.source !== null && query?.get('file') !== 'output' ? 'source' : 'output';
            let editor;
            const select = file => {
                kind = file;
                sourceTab.setAttribute('aria-pressed', String(kind === 'source'));
                outputTab.setAttribute('aria-pressed', String(kind === 'output'));
                fallback.textContent = script[kind];
                editor?.setValue(script[kind]);
            };
            const sourceTab = action('Source', () => select('source')); sourceTab.disabled = script.source === null;
            const outputTab = action('Protected output', () => select('output'));
            const fileExtension = () => kind === 'source' ? '.luau' : '.luavex.lua';
            fileTabs.append(sourceTab, outputTab, action('Copy', async () => {
                try { await navigator.clipboard.writeText(script[kind]); toast('Copied', 'success'); }
                catch { feedback.textContent = 'Clipboard unavailable.'; }
            }), action('Download', () => downloadText(script.name + fileExtension(), script[kind])));
            select(kind);
            page.append(title, controls, fileTabs, viewer);
            const monaco = await window.SukaRedDashboard.loadMonaco();
            if (page.parentNode !== outlet || !monaco) return;
            host.hidden = false;
            editor = monaco.editor.create(host, { value: script[kind], language: 'lua', theme: 'vs-dark', readOnly: true,
                automaticLayout: true, minimap: { enabled: false }, scrollBeyondLastLine: false });
            fallback.hidden = true;
            return () => { editor.getModel()?.dispose(); editor.dispose(); };
        } catch (error) { feedback.textContent = error.message || 'Could not load script.'; }
    };
    const account = ({ outlet }) => {
        const page = el('section', 'content-page page-section storage-page');
        page.append(heading('Account', 'Your account', ''));
        const auth = window.LuavexAuth.state;
        if (!auth.authenticated) page.append(action('Connect Discord', window.LuavexAuth.login));
        else {
            const profile = el('div', 'history-card');
            profile.append(el('h2', '', auth.account.displayName || auth.account.username),
                el('p', '', '@' + auth.account.username), el('p', '', auth.account.plan === 'premium' ? 'Premium plan' : 'Free plan'));
            if (auth.storageAvailable) profile.append(routeLink('My Storage', '/storage'));
            profile.append(action('Log out', () => window.LuavexAuth.logout().catch(() => toast('Could not log out.', 'error'))));
            page.append(profile);
        }
        setPage(outlet, page);
    };

    window.SukaRedViews = { storage, scriptDetails, nameScript, account, history, historyDetail, pricing, credits, changelog, settings, notFound };
})();
