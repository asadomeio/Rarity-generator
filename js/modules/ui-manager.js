import WowheadAPI from './wowhead-api.js';

function UIManager(document) {
    const elements = {
        tabs: document.querySelectorAll('.tab-button'),
        tabContents: document.querySelectorAll('.tab-content'),
        magicUrlInput: document.getElementById('magicUrlInput'),
        itemTypeSelect: document.getElementById('itemType'),
        itemNameInput: document.getElementById('itemName'),
        itemIDInput: document.getElementById('itemID'),
        npcIDsInput: document.getElementById('npcIDs'),
        itemChanceInput: document.getElementById('itemChance'),
        addItemBtn: document.getElementById('addItemBtn'),
        itemListDiv: document.getElementById('itemList'),
        generateCodeBtn: document.getElementById('generateCodeBtn'),
        outputCodeTextarea: document.getElementById('outputCode'),
        copyCodeBtn: document.getElementById('copyCodeBtn'),
        suggestPackBtn: document.getElementById('suggestPackBtn'),
        inspectInput: document.getElementById('inspectInput'),
        inspectBtn: document.getElementById('inspectBtn'),
        inspectionResultDiv: document.getElementById('inspectionResult'),
        packsListDiv: document.getElementById('packsList'),
        quickImportInput: document.getElementById('quickImportInput'),
        clearInputCheckbox: document.getElementById('clearInputCheckbox'),
        processQuickImportBtn: document.getElementById('processQuickImportBtn'),
        quickImportPreviewList: document.getElementById('quickImportPreviewList'),
        generateQuickImportCodeBtn: document.getElementById('generateQuickImportCodeBtn'),
        modalOverlay: document.getElementById('suggestion-modal'),
        modalCloseBtn: document.getElementById('modal-close'),
        packTitle: document.getElementById('packTitle'),
        packAuthor: document.getElementById('packAuthor'),
        packIcon: document.getElementById('packIcon'),
        generateSuggestionBtn: document.getElementById('generateSuggestionBtn'),
        submissionOutput: document.getElementById('submission-output'),
        submissionCode: document.getElementById('submissionCode'),
        copySubmissionBtn: document.getElementById('copySubmissionBtn'),
        githubIssueLink: document.getElementById('githubIssueLink'),
    };

    function switchTab(tabName) {
        elements.tabContents.forEach(content => content.classList.remove('active'));
        elements.tabs.forEach(tab => tab.classList.remove('active'));
        const activeContent = document.getElementById(`${tabName}-content`);
        if (activeContent) activeContent.classList.add('active');
        const activeTab = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
        if (activeTab) activeTab.classList.add('active');
    }

    function createItemEntry(item, isQuickPreview = false) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item-entry';
        const itemLink = `<a href="https://www.wowhead.com/item=${item.itemID}">${item.name || `Item ID: ${item.itemID}`}</a>`;
        const npcLinks = (item.npcIDs || []).map(id => `<a href="https://www.wowhead.com/npc=${id}">NPC #${id}</a>`).join(', ');
        const chanceText = item.chance ? ` (Chance: 1 in ${item.chance})` : '';
        const itemTypeDisplay = isQuickPreview
            ? `<select class="item-type-select">
                    <option value="MOUNT" ${item.type === 'MOUNT' ? 'selected' : ''}>Mount</option>
                    <option value="PET" ${item.type === 'PET' ? 'selected' : ''}>Pet</option>
                    <option value="TOY" ${item.type === 'TOY' ? 'selected' : ''}>Toy</option>
                    <option value="ITEM" ${item.type === 'ITEM' ? 'selected' : ''}>Item</option>
                </select>`
            : `[${item.type}]`;
        itemDiv.innerHTML = `<div class="item-info">${itemTypeDisplay} ${itemLink}<small>From: ${npcLinks}${chanceText}</small></div>`;
        return itemDiv;
    }

    function renderItemList(items, onRemove) {
        elements.itemListDiv.innerHTML = items.length ? '' : `<p class="placeholder-text">No items added yet.</p>`;
        items.forEach((item, index) => {
            const itemDiv = createItemEntry(item);
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn'; removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => onRemove(index);
            itemDiv.appendChild(removeBtn);
            elements.itemListDiv.appendChild(itemDiv);
        });
        WowheadAPI.refreshLinks();
    }
    
    function renderQuickImportPreview(items, onTypeChange) {
        elements.quickImportPreviewList.innerHTML = items.length ? '' : `<p class="placeholder-text">No items processed yet.</p>`;
        items.forEach((item, index) => {
            const itemDiv = createItemEntry(item, true);
            elements.quickImportPreviewList.appendChild(itemDiv);
        });
        elements.quickImportPreviewList.querySelectorAll('.item-type-select').forEach((select, index) => {
            select.addEventListener('change', (e) => onTypeChange(index, e.target.value));
        });
        WowheadAPI.refreshLinks();
    }

    function renderInspectedList(inspectedItems) {
        elements.inspectionResultDiv.innerHTML = !inspectedItems.length ? `<p class="placeholder-text">No items found.</p>` : '';
        inspectedItems.forEach(item => {
            elements.inspectionResultDiv.appendChild(createItemEntry(item));
        });
        WowheadAPI.refreshLinks();
    }
    
    function renderNotablePacks(packs, onAdd, onCopy) {
        let currentlyOpen = null;
        packs.forEach((pack) => {
            const card = document.createElement('div'); card.className = 'pack-card';
            const header = document.createElement('div'); header.className = 'pack-header';
            header.innerHTML = `<img src="${pack.icon}" alt="Pack Icon"><div class="pack-header-info"><strong>${pack.title}</strong><small>By ${pack.author}</small></div>`;
            const content = document.createElement('div'); content.className = 'pack-content';
            card.appendChild(header); card.appendChild(content);
            elements.packsListDiv.appendChild(card);
            header.addEventListener('click', () => {
                if (currentlyOpen && currentlyOpen !== content) currentlyOpen.style.maxHeight = '0px';
                if (content.style.maxHeight && content.style.maxHeight !== '0px') {
                    content.style.maxHeight = '0px'; currentlyOpen = null;
                } else {
                    if (content.innerHTML === '') {
                        pack.items.forEach(item => content.appendChild(createItemEntry(item)));
                        const actions = document.createElement('div'); actions.className = 'action-buttons';
                        const addBtn = document.createElement('button'); addBtn.textContent = 'Add to Generator';
                        addBtn.onclick = (e) => { e.stopPropagation(); onAdd(pack.items); };
                        const copyBtn = document.createElement('button'); copyBtn.textContent = 'Copy Import Code';
                        copyBtn.onclick = (e) => { e.stopPropagation(); onCopy(pack.importCode); };
                        actions.appendChild(addBtn); actions.appendChild(copyBtn);
                        content.appendChild(actions);
                        WowheadAPI.refreshLinks();
                    }
                    content.style.maxHeight = content.scrollHeight + "px";
                    currentlyOpen = content;
                }
            });
        });
    }

    function openSuggestionModal(items) {
        if (items.length === 0) {
            alert("Please add items to the list before suggesting a pack.");
            return;
        }
        elements.submissionOutput.classList.add('hidden');
        elements.modalOverlay.classList.remove('hidden');
    }

    function closeSuggestionModal() {
        elements.modalOverlay.classList.add('hidden');
    }
    
    function generateSubmissionText(packData, importCode) {
        const itemsText = packData.items.map(item => {
            return `      {\n        type: "${item.type}",\n        name: "${item.name.replace(/"/g, '\\"')}",\n        itemID: ${item.itemID},\n        chance: ${item.chance},\n        npcIDs: [${item.npcIDs.join(', ')}]\n      }`;
        }).join(',\n');
        return `  {\n    title: "${packData.title}",\n    author: "${packData.author}",\n    icon: "${packData.icon}",\n    importCode: "${importCode}",\n    items: [\n${itemsText}\n    ]\n  },`;
    }

    function showSubmissionContent(submissionText, repoUrl) {
        elements.submissionCode.value = submissionText;
        elements.submissionOutput.classList.remove('hidden');
        const issueTitle = `Pack Suggestion: ${elements.packTitle.value.trim()}`;
        const issueBody = `Please review the following community pack submission:\n\n\`\`\`javascript\n${submissionText}\n\`\`\``;
        elements.githubIssueLink.href = `${repoUrl}/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;
    }
    
    return {
        elements, switchTab, renderItemList, renderQuickImportPreview, renderInspectedList, renderNotablePacks, openSuggestionModal, closeSuggestionModal, generateSubmissionText, showSubmissionContent,
        clearManualInputs: () => {
            [elements.magicUrlInput, elements.itemNameInput, elements.itemIDInput, elements.npcIDsInput, elements.itemChanceInput].forEach(i => i.value = '');
            elements.magicUrlInput.className = ''; elements.magicUrlInput.focus();
        },
        setMagicInputState: (state) => { elements.magicUrlInput.className = state; },
        copyToClipboard: (text, message) => { navigator.clipboard.writeText(text).then(() => alert(message)); },
        renderInspectionError: (error) => {
            elements.inspectionResultDiv.innerHTML = `<div class="item-entry" style="color: var(--error-color);"><strong>Error:</strong> Invalid code.</div>`;
            console.error("Inspection error:", error);
        }
    };
}

export default UIManager;
