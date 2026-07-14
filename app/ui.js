(function () {
    'use strict';

    const profiles = [
        { id: 'light', name: 'Light', icon: '⚡', level: 'Low', status: 'Available', description: 'Quick, compact protection for everyday scripts.', enabled: true },
        { id: 'light_plus', name: 'Light+', icon: '✨', level: 'Medium', status: 'Available', description: 'A stronger balance of size and protection.', enabled: true },
        { id: 'good', name: 'Good', icon: '🛡', level: 'High', status: 'Recommended', description: 'Recommended protection for most releases.', enabled: true },
        { id: 'pro', name: 'Pro', icon: '🧪', level: 'Extreme', status: 'Experimental', description: 'Experimental profile. Test generated output before release.', enabled: true },
        { id: 'hell', name: 'Hell', icon: '🔥', level: 'Extreme', status: 'Unavailable', description: 'Reserved profile tier.', enabled: false },
        { id: 'blatant', name: 'Blatant', icon: '☠', level: 'Extreme', status: 'Unavailable', description: 'Reserved profile tier.', enabled: false },
        { id: 'fatality', name: 'Fatality', icon: '👑', level: 'Extreme', status: 'Unavailable', description: 'Reserved profile tier.', enabled: false }
    ];

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
            const card = el('button', `profile-card${selected === profile.id ? ' is-selected' : ''}${profile.enabled ? '' : ' is-locked'}`);
            card.type = 'button';
            card.disabled = !profile.enabled;
            card.dataset.profile = profile.id;
            card.setAttribute('role', 'radio');
            card.setAttribute('aria-checked', String(selected === profile.id));
            card.style.setProperty('--profile-accent', ({ light: '#67e8f9', light_plus: '#60a5fa', good: '#4ade80', pro: '#c084fc' }[profile.id] || '#fb7185'));
            const head = el('span', 'profile-card-head');
            const title = el('span', 'profile-title');
            title.append(el('span', 'profile-icon', profile.icon), el('strong', '', profile.name));
            head.append(title, el('span', profile.enabled ? 'profile-check' : 'profile-lock', profile.enabled ? '✓' : '🔒'));
            const meta = el('span', 'profile-card-meta');
            meta.append(el('span', 'protection-level', profile.level), el('span', 'profile-status', profile.status));
            card.append(head, el('span', 'profile-description', profile.description), meta);
            if (profile.enabled) card.addEventListener('click', () => onSelect(profile.id));
            grid.append(card);
        });
        return grid;
    };

    const toggle = (label, checked, onChange) => {
        const row = el('label', 'toggle-row');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = checked;
        input.addEventListener('change', () => onChange(input.checked));
        row.append(el('span', '', label), input, el('span', 'toggle-visual'));
        return row;
    };

    const customSelect = (value, choices, onChange, ariaLabel) => {
        let selected = String(value);
        const root = el('div', 'custom-select');
        const trigger = el('button', 'custom-select-trigger');
        trigger.type = 'button';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-label', ariaLabel || 'Select option');
        const label = el('span');
        const arrow = el('span', 'select-arrow', '⌄');
        trigger.append(label, arrow);
        const menu = el('div', 'custom-select-menu');
        menu.setAttribute('role', 'listbox');
        menu.hidden = true;
        const refresh = () => {
            const current = choices.find(choice => String(choice.value) === selected) || choices[0];
            label.textContent = current?.label || '';
            [...menu.children].forEach(button => button.setAttribute('aria-selected', String(button.dataset.value === selected)));
        };
        const close = () => { menu.hidden = true; root.classList.remove('is-open'); trigger.setAttribute('aria-expanded', 'false'); };
        const open = () => { menu.hidden = false; root.classList.add('is-open'); trigger.setAttribute('aria-expanded', 'true'); };
        choices.forEach(choice => {
            const option = el('button', 'custom-select-option', choice.label);
            option.type = 'button'; option.dataset.value = String(choice.value); option.setAttribute('role', 'option');
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
        const row = el('label', 'field-row');
        row.append(el('span', '', label));
        row.append(customSelect(value, choices, onChange, label).element);
        return row;
    };

    const toast = (message, type = 'info') => {
        const region = document.getElementById('toastRegion');
        const item = el('div', `toast toast-${type}`);
        item.setAttribute('role', type === 'error' ? 'alert' : 'status');
        item.append(el('span', '', message));
        const close = el('button', 'toast-close', '×');
        close.type = 'button';
        close.setAttribute('aria-label', 'Dismiss notification');
        close.addEventListener('click', () => item.remove());
        item.append(close);
        region.append(item);
        setTimeout(() => item.classList.add('is-visible'), 10);
        setTimeout(() => { item.classList.remove('is-visible'); setTimeout(() => item.remove(), 180); }, 4200);
    };

    let activeModal = null;
    const closeModal = () => {
        if (!activeModal) return;
        const overlay = activeModal;
        activeModal = null;
        overlay.classList.remove('is-open');
        document.body.classList.remove('modal-open');
        setTimeout(() => overlay.remove(), 180);
    };

    const openModal = ({ title, subtitle, content, actions = [] }) => {
        closeModal();
        const root = document.getElementById('modalRoot');
        const overlay = el('div', 'modal-overlay');
        const dialog = el('section', 'settings-modal');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.tabIndex = -1;
        const header = el('header', 'modal-header');
        const copy = el('div');
        const heading = el('h2', '', title);
        heading.id = `modal-${Date.now()}`;
        dialog.setAttribute('aria-labelledby', heading.id);
        copy.append(heading);
        if (subtitle) copy.append(el('p', '', subtitle));
        const close = el('button', 'icon-button modal-close', '×');
        close.type = 'button';
        close.setAttribute('aria-label', 'Close');
        close.addEventListener('click', closeModal);
        header.append(copy, close);
        const body = el('div', 'modal-body');
        body.append(content);
        const footer = el('footer', 'modal-actions');
        actions.forEach(action => {
            const button = el('button', action.primary ? 'button button-primary' : 'button', action.label);
            button.type = 'button';
            button.addEventListener('click', action.onClick);
            footer.append(button);
        });
        dialog.append(header, body, footer);
        overlay.append(dialog);
        overlay.addEventListener('click', event => { if (event.target === overlay) closeModal(); });
        const keyHandler = event => {
            if (!activeModal) { document.removeEventListener('keydown', keyHandler); return; }
            if (event.key === 'Escape') closeModal();
            if (event.key === 'Tab') {
                const focusable = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')];
                if (!focusable.length) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener('keydown', keyHandler);
        root.append(overlay);
        activeModal = overlay;
        document.body.classList.add('modal-open');
        requestAnimationFrame(() => { overlay.classList.add('is-open'); dialog.focus(); });
        return { overlay, dialog, body };
    };

    const confirm = (title, message) => new Promise(resolve => {
        const content = el('p', 'confirm-copy', message);
        openModal({
            title,
            content,
            actions: [
                { label: 'Cancel', onClick: () => { closeModal(); resolve(false); } },
                { label: 'Confirm', primary: true, onClick: () => { closeModal(); resolve(true); } }
            ]
        });
    });

    const settingsContent = (initial, onDraft) => {
        let draft = { ...initial };
        const root = el('div', 'settings-content');
        const update = changes => { draft = { ...draft, ...changes }; onDraft(draft); };
        const profileSection = el('section', 'settings-section');
        profileSection.append(el('h3', '', 'Protection Profile'));
        const mountProfiles = () => {
            const current = profileSection.querySelector('.profile-grid');
            const grid = profileGrid(draft.profile, profile => { update({ profile }); mountProfiles(); });
            if (current) current.replaceWith(grid); else profileSection.append(grid);
        };
        mountProfiles();
        const editorSection = el('section', 'settings-section');
        editorSection.append(el('h3', '', 'Editor'));
        const toggles = el('div', 'toggle-grid');
        toggles.append(
            toggle('Word Wrap', draft.wordWrap, value => update({ wordWrap: value })),
            toggle('Minimap', draft.minimap, value => update({ minimap: value })),
            toggle('Animation Effects', draft.animations, value => update({ animations: value })),
            toggle('Keep generated outputs', draft.keepOutputs, value => update({ keepOutputs: value }))
        );
        editorSection.append(toggles);
        const historySection = el('section', 'settings-section');
        historySection.append(el('h3', '', 'Local History'));
        const fields = el('div', 'settings-fields');
        fields.append(
            selectField('Retention', draft.retentionDays, [
                { value: 0, label: 'Never remove automatically' }, { value: 7, label: '7 days' },
                { value: 30, label: '30 days' }, { value: 90, label: '90 days' }
            ], value => update({ retentionDays: value })),
            selectField('Maximum entries', draft.maxHistoryEntries, [50, 100, 250, 500].map(value => ({ value, label: String(value) })), value => update({ maxHistoryEntries: value }))
        );
        historySection.append(fields);
        root.append(profileSection, editorSection, historySection);
        return root;
    };

    const openSettingsModal = () => {
        let draft = window.SukaRedSettings.load();
        const content = settingsContent(draft, value => { draft = value; });
        openModal({
            title: 'Settings',
            subtitle: 'Protection, editor and local history preferences.',
            content,
            actions: [
                { label: 'Cancel', onClick: closeModal },
                { label: 'Save Settings', primary: true, onClick: () => {
                    window.SukaRedSettings.save(draft);
                    document.body.classList.toggle('animations-off', !draft.animations);
                    closeModal();
                    toast('Settings saved', 'success');
                } }
            ]
        });
    };

    window.SukaRedUI = { el, profiles, profileGrid, toggle, customSelect, selectField, toast, openModal, closeModal, confirm, settingsContent, openSettingsModal };
})();
