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
    const nameKey = name => name.trim().normalize('NFKC').toLowerCase();
    const nameDialog = ({ title, name = '', submit, done, trigger = document.activeElement, build = false, checkDuplicates = false, existing = null }) => {
        if (document.querySelector('dialog[open]')) return null;
        const dialog = el('dialog', 'storage-dialog v0-name-modal');
        const form = el('form', 'storage-form');
        const label = el('label', '', 'Script name');
        const field = el('input', 'text-control'); field.value = name; field.autocomplete = 'off'; field.placeholder = 'my-script.luau';
        label.append(field);
        const icon = el('span', 'v0-modal-icon'); icon.append(window.SukaRedIcons.icon(build ? 'sparkles' : 'pencil'));
        const heading = el('h2', '', title); heading.id = 'storageDialogTitle'; dialog.setAttribute('aria-labelledby', heading.id);
        const description = el('p', 'v0-modal-description', build ? 'Give this build a name. Use a .luau extension.' : 'Update the script name.');
        const feedback = el('p', 'storage-feedback'); feedback.id = 'storageDialogError'; feedback.setAttribute('role', 'alert');
        field.setAttribute('aria-describedby', feedback.id);
        const conflictCard = el('div', 'v0-overwrite-card'); conflictCard.hidden = true;
        const close = action('×', () => dialog.close()); close.className = 'v0-close-modal'; close.setAttribute('aria-label', 'Close');
        const confirm = el('button', 'button button-primary', build ? 'Continue' : 'Save'); confirm.type = 'submit';
        const overwrite = action('Overwrite existing', () => complete({ name: field.value.trim(), target: conflict }));
        overwrite.className = 'button button-primary v0-overwrite'; overwrite.hidden = true;
        const cancel = action('Cancel', () => dialog.close());
        const controls = el('div', 'card-actions'); controls.append(cancel, confirm, overwrite);
        form.append(icon, heading, description, label, feedback, conflictCard, controls);
        dialog.append(close, form); document.body.append(dialog);
        let conflict, result, busy = false;
        const showConflict = record => {
            conflict = record;
            heading.textContent = 'Name already exists';
            description.textContent = 'Choose another name or explicitly overwrite this script.';
            conflictCard.replaceChildren(window.SukaRedIcons.icon('file'), el('strong', '', record.name));
            if (record.updated) conflictCard.append(el('small', '', 'Updated ' + formatDate(record.updated)));
            conflictCard.hidden = false; confirm.hidden = true; overwrite.hidden = false;
        };
        const complete = value => { result = value; dialog.close(); };
        dialog.addEventListener('close', () => {
            dialog.remove();
            if (trigger?.isConnected) trigger.focus();
            done?.(result);
        }, { once: true });
        dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
        dialog.addEventListener('click', event => { if (event.target === dialog && !busy) dialog.close(); });
        dialog.addEventListener('keydown', event => {
            if (event.key !== 'Tab') return;
            const first = close, last = conflict ? overwrite : confirm;
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        });
        field.addEventListener('input', () => {
            feedback.textContent = ''; field.removeAttribute('aria-invalid');
            conflict = null; heading.textContent = title; description.textContent = build ? 'Give this build a name. Use a .luau extension.' : 'Update the script name.';
            conflictCard.hidden = overwrite.hidden = true; confirm.hidden = false;
        });
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (busy || conflict) return;
            const value = field.value.trim();
            const error = window.SukaRedDashboard.helpers.scriptNameError(value) ||
                (build && checkDuplicates && !/^[\w.-]+\.luau$/i.test(value) && nameKey(value) !== nameKey(existing?.name || '')
                    ? 'Use letters, numbers, dots, dashes, and a .luau extension.' : '');
            if (error) { feedback.textContent = error; field.setAttribute('aria-invalid', 'true'); field.focus(); return; }
            busy = true; confirm.disabled = cancel.disabled = close.disabled = field.readOnly = true;
            try {
                if (!build) { complete(await submit(value)); return; }
                if (checkDuplicates) {
                    const { scripts } = await storageRequest('');
                    if (!dialog.open) return;
                    const matches = scripts.filter(script => nameKey(script.name) === nameKey(value));
                    const selected = matches.find(script => script.id === existing?.id);
                    if (selected || matches.length === 1) { showConflict(selected || matches[0]); return; }
                    if (matches.length > 1) { feedback.textContent = 'Several scripts share this name. Open the intended script from My Scripts or choose another name.'; return; }
                }
                complete({ name: value });
            } catch (error) { feedback.textContent = error.message || 'Could not verify the script name.'; }
            finally { busy = false; confirm.disabled = cancel.disabled = close.disabled = field.readOnly = false; }
        });
        if (existing) showConflict(existing);
        dialog.showModal(); field.select();
        return () => { if (dialog.open) dialog.close(); };
    };
    const nameScript = (trigger, done, options = {}) => nameDialog({
        title: 'Name your script', name: options.initial, trigger, done, build: true,
        checkDuplicates: options.checkDuplicates, existing: options.existing
    });
    const renameScript = (trigger, name, submit, done) => nameDialog({ title: 'Rename script', trigger, name, submit, done });
    const storagePage = (outlet, title) => {
        const page = el('section', 'content-page page-section storage-page');
        const head = heading('Account / Scripts', title, title === 'My Scripts' ? 'Manage your protected scripts.' : '');
        if (title === 'My Scripts' && window.LuavexAuth.state.authenticated) {
            const create = action('New script', () => {
                window.SukaRedDashboard.newScript(); window.sukaredApp.router.navigate('/workspace');
            });
            create.classList.add('button-primary'); create.prepend(window.SukaRedIcons.icon('plus', {size:15}));
            head.append(create);
        }
        page.append(head);
        setPage(outlet, page);
        const auth = window.LuavexAuth.state;
        if (!auth.authenticated) page.append(action('Connect Discord', window.LuavexAuth.login));
        else if (!auth.storageAvailable) page.append(el('p', '', 'Storage is not available.'));
        return auth.authenticated && auth.storageAvailable ? page : null;
    };
    const metricValue = value => value == null ? 'Not available' : new Intl.NumberFormat().format(value);
    const metrics = entries => {
        const group = el('dl', 'library-metrics');
        for (const [label, value, icon, note] of entries) {
            const item = el('div');
            if (icon) item.append(window.SukaRedIcons.icon(icon, {size:17}));
            item.append(el('dt', '', label), el('dd', '', value));
            if (note) item.append(el('small', '', note));
            group.append(item);
        }
        return group;
    };
    const moreActions = (...actions) => {
        const menu = el('details', 'library-menu');
        const trigger = el('summary', '', '···'); trigger.setAttribute('aria-label', 'More actions');
        const choices = el('div', 'library-menu-items'); choices.append(...actions);
        menu.append(trigger, choices);
        menu.addEventListener('toggle', () => {
            if (!menu.open) return;
            const rect = trigger.getBoundingClientRect();
            menu.classList.toggle('opens-up', innerHeight - rect.bottom < choices.offsetHeight + 8 && rect.top > choices.offsetHeight + 8);
        });
        menu.addEventListener('focusout', event => { if (!menu.contains(event.relatedTarget)) menu.open = false; });
        menu.addEventListener('keydown', event => {
            if (event.key === 'Escape' && menu.open) { menu.open = false; trigger.focus(); }
        });
        return menu;
    };
    const openWorkspace = script => {
        window.SukaRedDashboard.openStored(script);
        window.sukaredApp.router.navigate('/workspace');
    };
    const dashboardChart = (series, compact = false) => {
        const panel = el('section', compact ? 'library-chart v0-chart v0-chart-compact' : 'library-chart v0-chart');
        const header = el('div', 'v0-chart-head');
        const copy = el('div'); copy.append(el('h2', '', compact ? 'Execution history' : 'Hosted runs'), el('p', 'script-library-meta', 'Authorized deliveries · UTC'));
        const period = el('select', 'text-control'); period.setAttribute('aria-label', 'Chart period');
        for (const value of [7, 30]) { const option = el('option', '', value + ' days'); option.value = String(value); period.append(option); }
        header.append(copy); if (!compact) header.append(period); panel.append(header);
        const graph = el('div', 'v0-chart-body'); panel.append(graph);
        const paint = () => {
            graph.replaceChildren();
            const days = series?.slice(-Number(period.value));
            if (!days?.length) { graph.append(el('p', 'script-library-meta', 'No measured hosted runs are available yet.')); return; }
            const peak = Math.max(4, ...days.map(day => day.runs));
            const limit = Math.ceil(peak / 4) * 4;
            const grid = el('div', 'v0-chart-grid'); grid.setAttribute('aria-hidden', 'true');
            for (let value = limit; value >= 0; value -= limit/4) grid.append(el('span', '', String(value)));
            const svg = (name, attrs) => {
                const node = document.createElementNS('http://www.w3.org/2000/svg', name);
                for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
                return node;
            };
            const width = 700, height = 190;
            const points = days.map((day, i) => [i*width/Math.max(1,days.length-1), height - day.runs*height/limit]);
            const plot = svg('svg', {viewBox:'0 0 700 190', preserveAspectRatio:'none', role:'img', 'aria-label':'Daily hosted runs'});
            const gradient = svg('linearGradient', {id:'hosted-run-fill', x1:'0%', x2:'0%', y1:'0%', y2:'100%'});
            gradient.append(svg('stop', {offset:'0%', 'stop-color':'#367dff','stop-opacity':'.22'}),
                svg('stop', {offset:'100%', 'stop-color':'#367dff','stop-opacity':'0'}));
            const defs = svg('defs', {}); defs.append(gradient);
            const line = points.map(point => point.join(' ')).join(' L ');
            plot.append(defs, svg('path', {d:`M 0 ${height} L ${line} L ${points.at(-1)[0]} ${height} Z`, fill:'url(#hosted-run-fill)'}),
                svg('polyline', {points:points.map(point=>point.join(',')).join(' '), fill:'none', stroke:'#4d8cff', 'stroke-width':2.5,'vector-effect':'non-scaling-stroke'}));
            const labels = el('div', 'v0-chart-dates');
            for (const [i, day] of days.entries()) {
                const [cx,cy] = points[i];
                const dot = svg('circle', {cx,cy,r:days.length > 7 ? 2 : 4,fill:'#0b0d12',stroke:'#4d8cff','stroke-width':2});
                const title = svg('title', {}); title.textContent = day.date + ': ' + day.runs + ' runs'; dot.append(title); plot.append(dot);
                if (i === 0 || i === days.length-1 || (days.length > 7 ? i % 5 === 0 : true)) labels.append(el('span', '', day.date.slice(5)));
            }
            graph.append(grid, plot, labels);
            if (days.length < Number(period.value)) graph.append(el('p', 'script-library-meta', 'History available for ' + days.length + ' days.'));
        };
        period.addEventListener('change', paint); paint();
        return panel;
    };
    const storage = async ({ outlet }) => {
        const page = storagePage(outlet, 'My Scripts');
        if (!page) return;
        const filter = el('input', 'text-control'); filter.placeholder = 'Search scripts'; filter.setAttribute('aria-label', 'Search scripts');
        const sort = el('select', 'text-control'); sort.setAttribute('aria-label', 'Sort scripts');
        for (const [value, label] of [['updated','Recently updated'],['name','Name']]) {
            const option = el('option', '', label); option.value = value; sort.append(option);
        }
        const tools = el('div', 'history-controls');
        const search = el('label', 'v0-search'); search.append(window.SukaRedIcons.icon('search', {size:14}), filter); tools.append(search, sort);
        const usage = el('div', 'library-overview', 'Loading scripts…');
        const list = el('div', 'library-list');
        const columns = el('div', 'library-row library-columns');
        for (const label of ['Script','Total runs','Last 24 hours','Size','Status','Actions']) columns.append(el('span', '', label));
        const chart = el('div', 'library-dashboard-chart');
        const collection = el('section', 'v0-scripts-section');
        collection.append(el('span', 'eyebrow', 'Library'), el('h2', '', 'Your scripts'), tools, columns, list);
        usage.setAttribute('role','status'); usage.setAttribute('aria-busy','true');
        page.append(usage, chart, collection);
        let scripts = [];
        const refresh = async () => {
            const result = await storageRequest('');
            if (page.parentNode !== outlet) return;
            scripts = result.scripts;
            const measured = scripts.filter(script => script.executions);
            const sum = key => measured.length ? measured.reduce((total, row) => total + row.executions[key], 0) : null;
            usage.removeAttribute('aria-busy');
            usage.replaceChildren(metrics([
                ['Total scripts', metricValue(scripts.length), 'file', 'Saved scripts'],
                ['Total hosted runs', metricValue(sum('total')), 'activity', 'Authorized deliveries'],
                ['Runs today', metricValue(sum('today')), 'clock', 'UTC'],
                ['Storage used', formatBytes(result.usage.used), 'chart', 'Source and protected output']
            ]));
            chart.replaceChildren(dashboardChart(result.runHistory));
            draw();
        };
        const draw = () => {
            const search = filter.value.trim().toLowerCase();
            const visible = scripts.filter(row => row.name.toLowerCase().includes(search));
            if (sort.value === 'name') visible.sort((a,b) => a.name.localeCompare(b.name));
            list.replaceChildren();
            if (!visible.length) list.append(el('p', 'empty-state', search ? 'No matching scripts.' : 'Save a build from Workspace to get started.'));
            for (const row of visible) {
                const card = el('article', 'library-row');
                const buttons = el('div', 'library-row-actions');
                const key = '/' + encodeURIComponent(row.id);
                const url = '/storage' + key;
                const getScript = async () => (await storageRequest(key)).script;
                const more = [];
                if (row.source_bytes) more.push(routeLink('View Source', url + '?file=source'));
                more.push(routeLink('View Protected Output', url + '?file=output'));
                if (row.source_bytes) more.push(action('Open in Workspace', async () => {
                    try { openWorkspace(await getScript()); } catch (error) { toast(error.message, 'error'); }
                }));
                more.push(action('Download', async () => {
                    try {
                        const script = await getScript();
                        downloadText(script.name.replace(/\.(?:lua|luau)$/i, '') + '.luavex.lua', script.output);
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
                const identity = el('div', 'library-identity');
                const updated = el('p', 'script-library-meta', 'Updated ' + formatDate(row.updated));
                if (row.created) updated.title = 'Created ' + formatDate(row.created);
                const mark = el('span', 'v0-file-icon'); mark.append(window.SukaRedIcons.icon('file', {size:15}));
                const text = el('div'); text.append(el('h2', '', row.name), updated); identity.append(mark, text);
                buttons.append(routeLink('Open', url), moreActions(...more));
                card.append(identity);
                for (const [label, value] of [
                    ['Total runs', metricValue(row.executions?.total)],
                    ['Last 24 hours', metricValue(row.executions?.last24)],
                    ['Size', formatBytes(row.source_bytes + row.output_bytes)],
                    ['Status', 'Protected']
                ]) {
                    const cell = el('div', 'library-cell');
                    cell.append(el('span', 'library-cell-label', label), el('span', label === 'Status' ? 'v0-protected' : '', value));
                    card.append(cell);
                }
                card.append(buttons);
                list.append(card);
            }
        };
        try {
            filter.addEventListener('input', draw); sort.addEventListener('change', draw);
            await refresh();
        } catch (error) {
            usage.removeAttribute('aria-busy'); usage.textContent = error.message || 'Could not load scripts.';
            usage.append(action('Retry', () => { void refresh().catch(next => { usage.firstChild.textContent = next.message || 'Could not load scripts.'; }); }));
        }
    };
    const scriptDetails = async ({ outlet, params, query }) => {
        const page = storagePage(outlet, 'Script Details');
        if (!page) return;
        const key = '/' + encodeURIComponent(params.id);
        const feedback = el('p', 'storage-feedback'); feedback.setAttribute('role', 'status');
        page.querySelector('header')?.remove();
        const breadcrumb = el('nav', 'library-breadcrumb'); breadcrumb.setAttribute('aria-label', 'Breadcrumb');
        const current = el('span', '', 'Script Details'); current.setAttribute('aria-current', 'page');
        breadcrumb.append(routeLink('← Back to My Scripts', '/history'), current);
        page.append(breadcrumb, feedback);
        try {
            const { script } = await storageRequest(key);
            if (page.parentNode !== outlet) return;
            const title = el('h1', '', script.name);
            const updatedDate = el('p', 'script-library-meta', 'Updated ' + formatDate(script.updated));
            const controls = el('div', 'library-row-actions');
            const rename = action('Rename', () => nameDialog({
                title: 'Rename script', name: script.name,
                submit: name => storageRequest(key, 'PATCH', { name }),
                done: ({ script: updated }) => { script.name = updated.name; title.textContent = updated.name; updatedDate.textContent = 'Updated ' + formatDate(updated.updated); }
            }));
            if (script.source !== null) controls.append(action('Open in Workspace', () => openWorkspace(script)));
            const remove = action('Delete', async () => {
                if (!await confirm('Delete this script?', 'This removes its saved files. Shared loaders remain active.')) return;
                try { await storageRequest(key, 'DELETE'); window.sukaredApp.router.navigate('/history'); }
                catch (error) { feedback.textContent = error.message; }
            });
            controls.append(moreActions(rename, remove));
            const details = el('div', 'library-details-head');
            const identity = el('div'); identity.append(title, updatedDate);
            details.append(identity, controls);
            const fileTabs = el('div', 'library-editor-bar');
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
            const tabs = el('div', 'library-file-tabs'); tabs.append(sourceTab, outputTab);
            const files = el('div', 'library-row-actions');
            files.append(action('Copy', async () => {
                try { await navigator.clipboard.writeText(script[kind]); toast('Copied', 'success'); }
                catch { feedback.textContent = 'Clipboard unavailable.'; }
            }), action('Download', () => downloadText(script.name.replace(/\.(?:lua|luau)$/i, '') + fileExtension(), script[kind])));
            select(kind);
            fileTabs.append(tabs);
            const codeToolbar = el('div', 'v0-code-toolbar'); codeToolbar.append(el('span', '', '● Luau'), files);
            const editorSection = el('section', 'library-editor'); editorSection.append(fileTabs, codeToolbar, viewer);
            const runs = script.executions;
            page.append(details, metrics([
                ['Total hosted runs', metricValue(runs?.total)], ['Last 24 hours', metricValue(runs?.last24)],
                ['Last 7 days', metricValue(runs?.last7)]
            ]), dashboardChart(runs?.series, true), editorSection);
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
            if (auth.storageAvailable) profile.append(routeLink('My Scripts', '/history'));
            profile.append(action('Log out', () => window.LuavexAuth.logout().catch(() => toast('Could not log out.', 'error'))));
            page.append(profile);
        }
        setPage(outlet, page);
    };

    window.SukaRedViews = { storage, scriptDetails, nameScript, renameScript, account, history, historyDetail, pricing, credits, changelog, settings, notFound };
})();
