(function () {
    'use strict';

    const profiles = Object.freeze([
        { id: 'light', name: 'Light', level: 'Low', intensity: 1, cost: 0, status: 'Available', description: 'Compact protection for quick builds.', enabled: true },
        { id: 'light_plus', name: 'Light+', level: 'Medium', intensity: 2, cost: 0, status: 'Available', description: 'Balanced output size and protection.', enabled: true },
        { id: 'good', name: 'Good', level: 'High', intensity: 3, cost: 0, status: 'Recommended', description: 'Recommended balance between protection, performance and compatibility.', enabled: true },
        { id: 'pro', name: 'Pro', level: 'Maximum', intensity: 4, cost: 0, status: 'Available', description: 'Advanced protection profile for users requiring stronger protection.', enabled: true },
        { id: 'hell', name: 'Hell', level: 'Extreme', intensity: 5, status: 'Coming Soon', description: 'Experimental maximum protection profile for high-value scripts.', enabled: false },
        { id: 'blatant', name: 'Blatant', level: 'Severe', intensity: 6, status: 'Future', description: 'Aggressive structural protection.', enabled: false },
        { id: 'fatality', name: 'Fatality', level: 'Ultimate', intensity: 7, status: 'Future', description: 'Highest-intensity protection profile.', enabled: false }
    ]);

    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    };

    const profileGrid = (selected, onSelect) => {
        const grid = el('div', 'profile-grid');
        grid.setAttribute('role', 'radiogroup');
        grid.setAttribute('aria-label', 'Protection profile');
        profiles.forEach(profile => {
            const card = el('button', `profile-card${selected === profile.id ? ' is-selected' : ''}`);
            card.type = 'button';
            card.dataset.profile = profile.id;
            card.dataset.intensity = String(profile.intensity);
            card.setAttribute('role', 'radio');
            card.setAttribute('aria-checked', String(selected === profile.id));
            card.disabled = !profile.enabled;
            card.setAttribute('aria-disabled', String(!profile.enabled));
            const head = el('span', 'profile-card-head');
            const title = el('strong', 'profile-title', profile.name);
            const signal = el('span', 'profile-signal');
            signal.setAttribute('aria-hidden', 'true');
            for (let index = 0; index < profile.intensity; index++) signal.append(el('i'));
            const marker = el('span', 'profile-check'); marker.append(window.SukaRedIcons.icon('check', { size: 15 }));
            head.append(title, signal, marker);
            const meta = el('span', 'profile-card-meta');
            meta.append(el('span', 'protection-level', profile.level), el('span', 'profile-status', profile.status), el('span', 'profile-cost', profile.enabled ? (profile.cost === 0 ? 'FREE' : `${profile.cost} credits`) : 'LOCKED'));
            card.append(head, el('span', 'profile-description', profile.description), meta);
            if (profile.enabled) card.addEventListener('click', () => onSelect(profile.id));
            grid.append(card);
        });
        return grid;
    };

    const toggle = (label, checked, onChange) => {
        const row = el('label', 'toggle-row');
        const input = document.createElement('input'); input.type = 'checkbox'; input.checked = checked;
        input.addEventListener('change', () => onChange(input.checked));
        row.append(el('span', '', label), input, el('span', 'toggle-visual'));
        return row;
    };

    const customSelect = (value, choices, onChange, ariaLabel) => {
        let selected = String(value);
        const root = el('div', 'custom-select');
        const trigger = el('button', 'custom-select-trigger'); trigger.type = 'button';
        trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-label', ariaLabel || 'Select option');
        const label = el('span'); const arrow = el('span', 'select-arrow'); arrow.append(window.SukaRedIcons.icon('chevron', { size: 14 }));
        trigger.append(label, arrow);
        const menu = el('div', 'custom-select-menu'); menu.setAttribute('role', 'listbox'); menu.hidden = true;
        const refresh = () => {
            const current = choices.find(choice => String(choice.value) === selected) || choices[0];
            label.textContent = current?.label || '';
            [...menu.children].forEach(button => button.setAttribute('aria-selected', String(button.dataset.value === selected)));
        };
        const close = () => { menu.hidden = true; root.classList.remove('is-open'); trigger.setAttribute('aria-expanded', 'false'); };
        const open = () => { menu.hidden = false; root.classList.add('is-open'); trigger.setAttribute('aria-expanded', 'true'); };
        choices.forEach(choice => {
            const option = el('button', 'custom-select-option', choice.label); option.type = 'button'; option.dataset.value = String(choice.value); option.setAttribute('role', 'option');
            option.addEventListener('click', () => {
                selected = option.dataset.value; refresh(); close();
                const parsed = Number.isNaN(Number(selected)) || selected === '' ? selected : Number(selected);
                onChange(parsed);
            });
            menu.append(option);
        });
        trigger.addEventListener('click', () => menu.hidden ? open() : close());
        trigger.addEventListener('keydown', event => {
            if (['ArrowDown', 'Enter', ' '].includes(event.key) && menu.hidden) { event.preventDefault(); open(); menu.querySelector('[aria-selected="true"]')?.focus(); }
            if (event.key === 'Escape') close();
        });
        root.addEventListener('focusout', event => { if (!root.contains(event.relatedTarget)) close(); });
        root.append(trigger, menu); refresh();
        return { element: root, get value() { return selected; }, set value(next) { selected = String(next); refresh(); } };
    };

    const selectField = (label, value, choices, onChange) => {
        const row = el('label', 'field-row'); row.append(el('span', '', label), customSelect(value, choices, onChange, label).element); return row;
    };

    const toast = (message, type = 'info') => {
        const region = document.getElementById('toastRegion');
        const item = el('div', `toast toast-${type}`); item.setAttribute('role', type === 'error' ? 'alert' : 'status'); item.append(el('span', '', message));
        const close = el('button', 'toast-close'); close.type = 'button'; close.setAttribute('aria-label', 'Dismiss notification'); close.append(window.SukaRedIcons.icon('close', { size: 14 })); close.addEventListener('click', () => item.remove());
        item.append(close); region.append(item);
        setTimeout(() => item.classList.add('is-visible'), 10);
        setTimeout(() => { item.classList.remove('is-visible'); setTimeout(() => item.remove(), 180); }, 4200);
    };

    let activeModal = null;
    let modalTrigger = null;
    const closeModal = () => {
        if (!activeModal) return;
        const overlay = activeModal; activeModal = null;
        overlay.classList.remove('is-open'); document.body.classList.remove('modal-open');
        setTimeout(() => overlay.remove(), 180);
        const restore = modalTrigger; modalTrigger = null; restore?.focus?.({ preventScroll: true });
    };

    const openModal = ({ title, subtitle, content, actions = [], trigger = document.activeElement }) => {
        closeModal();
        modalTrigger = trigger instanceof HTMLElement ? trigger : null;
        const overlay = el('div', 'modal-overlay');
        const dialog = el('section', 'settings-modal'); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.tabIndex = -1;
        const header = el('header', 'modal-header'); const copy = el('div'); const heading = el('h2', '', title); heading.id = `modal-${Date.now()}`; dialog.setAttribute('aria-labelledby', heading.id); copy.append(heading); if (subtitle) copy.append(el('p', '', subtitle));
        const close = el('button', 'icon-button modal-close'); close.type = 'button'; close.setAttribute('aria-label', 'Close settings'); close.append(window.SukaRedIcons.icon('close')); close.addEventListener('click', closeModal); header.append(copy, close);
        const body = el('div', 'modal-body'); body.append(content);
        const footer = el('footer', 'modal-actions');
        actions.forEach(action => { const button = el('button', action.primary ? 'button button-primary' : 'button', action.label); button.type = 'button'; button.addEventListener('click', action.onClick); footer.append(button); });
        dialog.append(header, body, footer); overlay.append(dialog);
        overlay.addEventListener('click', event => { if (event.target === overlay) closeModal(); });
        const keyHandler = event => {
            if (!activeModal) { document.removeEventListener('keydown', keyHandler); return; }
            if (event.key === 'Escape') closeModal();
            if (event.key === 'Tab') {
                const focusable = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')];
                if (!focusable.length) return;
                const first = focusable[0]; const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener('keydown', keyHandler);
        document.getElementById('modalRoot').append(overlay); activeModal = overlay; document.body.classList.add('modal-open');
        requestAnimationFrame(() => { overlay.classList.add('is-open'); dialog.focus(); });
        return { overlay, dialog, body };
    };

    const confirm = (title, message) => new Promise(resolve => {
        openModal({ title, content: el('p', 'confirm-copy', message), actions: [
            { label: 'Cancel', onClick: () => { closeModal(); resolve(false); } },
            { label: 'Confirm', primary: true, onClick: () => { closeModal(); resolve(true); } }
        ] });
    });

    const settingsContent = (initial, onDraft) => {
        let draft = { ...initial };
        const root = el('div', 'settings-content');
        const update = changes => { draft = { ...draft, ...changes }; onDraft(draft); };
        const profileSection = el('section', 'settings-section'); profileSection.append(el('h3', '', 'Protection Profile'), el('p', 'section-note', 'All available profiles are free during the public beta.'));
        const mountProfiles = () => {
            const current = profileSection.querySelector('.profile-grid');
            const grid = profileGrid(draft.profile, profile => { update({ profile }); mountProfiles(); });
            if (current) current.replaceWith(grid); else profileSection.append(grid);
        };
        mountProfiles();
        const editorSection = el('section', 'settings-section'); editorSection.append(el('h3', '', 'Workspace'));
        const toggles = el('div', 'toggle-grid');
        toggles.append(toggle('Word Wrap', draft.wordWrap, value => update({ wordWrap: value })), toggle('Minimap', draft.minimap, value => update({ minimap: value })), toggle('Motion', draft.animations, value => update({ animations: value })), toggle('Keep generated outputs', draft.keepOutputs, value => update({ keepOutputs: value })));
        editorSection.append(toggles);
        const historySection = el('section', 'settings-section'); historySection.append(el('h3', '', 'Local History'));
        const fields = el('div', 'settings-fields');
        fields.append(selectField('Retention', draft.retentionDays, [{ value: 0, label: 'Never remove automatically' }, { value: 7, label: '7 days' }, { value: 30, label: '30 days' }, { value: 90, label: '90 days' }], value => update({ retentionDays: value })), selectField('Maximum entries', draft.maxHistoryEntries, [50, 100, 250, 500].map(value => ({ value, label: String(value) })), value => update({ maxHistoryEntries: value })));
        historySection.append(fields); root.append(profileSection, editorSection, historySection); return root;
    };

    const openSettingsModal = trigger => {
        let draft = window.SukaRedSettings.load();
        openModal({
            title: 'Settings', subtitle: 'Protection and local workspace preferences.', trigger,
            content: settingsContent(draft, value => { draft = value; }),
            actions: [
                { label: 'Cancel', onClick: closeModal },
                { label: 'Save Settings', primary: true, onClick: () => { window.SukaRedSettings.save(draft); document.body.classList.toggle('animations-off', !draft.animations); closeModal(); toast('Settings saved', 'success'); } }
            ]
        });
    };

    window.SukaRedUI = { el, profiles, profileGrid, toggle, customSelect, selectField, toast, openModal, closeModal, confirm, settingsContent, openSettingsModal };
})();
