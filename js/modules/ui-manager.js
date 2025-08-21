import WowheadAPI from './wowhead-api.js';

function UIManager(document) {
    const elements = {
        tabs: document.querySelectorAll('.tab-button'),
        tabContents: document.querySelectorAll('.tab-content'),
        magicUrlInput: document.getElementById('magicUrlInput'),
        itemNameInput: document.getElementById('itemName'),
        itemIDInput: document.getElementById('itemID'),
        npcIDsInput: document.getElementById('npcIDs'),
        itemChanceInput: document.getElementById('itemChance'),
        addItemBtn: document.getElementById('addItemBtn'),
        itemListDiv: document.getElementById('itemList'),
        generateCodeBtn: document.getElementById('generateCodeBtn'),
        outputCodeTextarea: document.getElementById('outputCode'),
        copyCodeBtn: document.getElementById('copyCodeBtn'),
        inspectInput: document.getElementById('inspectInput'),
        inspectBtn: document.getElementById('inspectBtn'),
        inspectionResultDiv: document.getElementById('inspectionResult'),
        suggestPackBtn: document.getElementById('suggestPackBtn'),
        packsListDiv: document.getElementById('packsList'),
        // Modal elements
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

        document.getElementById(`${tabName}-content`).classList.add('active');
        document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add('active');
    }

    function createItemEntry(item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item-entry';
        const itemLink = `<a href="https://www.wowhead.com/item=${item.itemID}">${item.name || `Item ID: ${item.itemID}`}</a>`;
        const npcLinks = (item.npcs || item.npcIDs || []).map(npc => 
            `<a href="https://www.wowhead.com/npc=${npc.id || npc}">${npc.name || `NPC #${npc.id || npc}`}</a>`
        ).join(', ');
        
        const chanceText = item.chance ? ` (Chance: 1 in ${item.chance})` : '';
        itemDiv.innerHTML = `<div class="item-info"><span>${itemLink}</span><small>From: ${npcLinks}${chanceText}</small></div>`;
        return itemDiv;
    }

    function renderItemList(items, onRemove) {
        elements.itemListDiv.innerHTML = items.length ? '' : `<p class="placeholder-text">No items added yet.</p>`;
        items.forEach((item, index) => {
            const itemDiv = createItemEntry(item);
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => onRemove(index);
            itemDiv.appendChild(removeBtn);
            elements.itemListDiv.appendChild(itemDiv);
        });
        WowheadAPI.refreshLinks();
    }

    function renderInspectedList(inspectedItems) {
        if (!inspectedItems.length) {
            elements.inspectionResultDiv.innerHTML = `<p class="placeholder-text">No items found in the provided code.</p>`;
            return;
        }
        elements.inspectionResultDiv.innerHTML = '';
        inspectedItems.forEach(item => {
            elements.inspectionResultDiv.appendChild(createItemEntry(item));
        });
        WowheadAPI.refreshLinks();
    }
    
    function renderInspectionError(error) {
        elements.inspectionResultDiv.innerHTML = `<div class="item-entry" style="color: var(--error-color);"><strong>Error:</strong> Invalid or corrupted Rarity code.</div>`;
        console.error("Inspection error:", error);
    }
    
    function renderNotablePacks(packs, onAdd, onCopy) {
        if (!packs.length) return;
        elements.packsListDiv.innerHTML = '';
        let currentlyOpen = null;

        packs.forEach((pack, index) => {
            const card = document.createElement('div');
            card.className = 'pack-card';
            
            const header = document.createElement('div');
            header.className = 'pack-header';
            header.innerHTML = `
                <img src="${pack.icon || 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg'}" alt="Pack Icon">
                <div class="pack-header-info">
                    <strong>${pack.title}</strong>
                    <small>By ${pack.author}</small>
                </div>`;
            
            const content = document.createElement('div');
            content.className = 'pack-content';
            
            card.appendChild(header);
            card.appendChild(content);
            elements.packsListDiv.appendChild(card);

            header.addEventListener('click', () => {
                if (currentlyOpen && currentlyOpen !== content) {
                    currentlyOpen.style.maxHeight = '0px';
                }
                if (content.style.maxHeight && content.style.maxHeight !== '0px') {
                    content.style.maxHeight = '0px';
                    currentlyOpen = null;
                } else {
                    if (content.innerHTML === '') {
                        pack.items.forEach(item => content.appendChild(createItemEntry(item)));
                        const actions = document.createElement('div');
                        actions.className = 'action-buttons';
                        actions.style.padding = '15px';
                        
                        const addBtn = document.createElement('button');
                        addBtn.textContent = 'Add to Generator';
                        addBtn.onclick = (e) => { e.stopPropagation(); onAdd(pack.items); };
                        
                        const copyBtn = document.createElement('button');
                        copyBtn.className = 'secondary';
                        copyBtn.textContent = 'Copy Import Code';
                        copyBtn.onclick = (e) => { e.stopPropagation(); onCopy(pack.importCode); };
                        
                        actions.appendChild(addBtn);
actions.appendChild(copyBtn);
                        content.appendChild(actions);
                        WowheadAPI.refreshLinks();
                    }
                    content.style.maxHeight = content.scrollHeight + "px";
                    currentlyOpen = content;
                }
            });
        });
    }

    function openSuggestionModal() {
        elements.submissionOutput.classList.add('hidden');
        elements.modalOverlay.classList.remove('hidden');
    }

    function closeSuggestionModal() {
        elements.modalOverlay.classList.add('hidden');
    }
    
    function generateSubmissionText(packData, importCode) {
        const itemsText = packData.items.map(item => {
            const npcText = item.npcs.map(npc => `          { name: "${npc.name}", id: ${npc.id} }`).join(',\n');
            return `      {\n        name: "${item.name}",\n        itemID: ${item.itemID},\n        chance: ${item.chance},\n        npcs: [\n${npcText}\n        ]\n      }`;
        }).join(',\n');

        return `{\n  title: "${packData.title}",\n  author: "${packData.author}",\n  icon: "${packData.icon}",\n  importCode: "${importCode}",\n  items: [\n${itemsText}\n  ]\n},`;
    }

    function showSubmissionContent(submissionText, repoUrl) {
        elements.submissionCode.value = submissionText;
        elements.submissionOutput.classList.remove('hidden');
        const issueTitle = `Pack Suggestion: ${elements.packTitle.value.trim()}`;
        const issueBody = `Please review the following community pack submission:\n\n\`\`\`javascript\n${submissionText}\n\`\`\``;
        elements.githubIssueLink.href = `${repoUrl}/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;
    }
    
    function copyToClipboard(text, message) {
        navigator.clipboard.writeText(text).then(() => {
            alert(message);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy. Please copy manually.');
        });
    }
    
    return {
        elements,
        switchTab,
        renderItemList,
        renderInspectedList,
        renderInspectionError,
        renderNotablePacks,
        clearManualInputs: () => {
            [elements.magicUrlInput, elements.itemNameInput, elements.itemIDInput, elements.npcIDsInput, elements.itemChanceInput].forEach(i => i.value = '');
            elements.magicUrlInput.className = '';
            elements.magicUrlInput.focus();
        },
        setMagicInputState: (state) => {
            elements.magicUrlInput.className = state;
        },
        openSuggestionModal,
        closeSuggestionModal,
        generateSubmissionText,
        showSubmissionContent,
        showSpinner: (button) => {
            button.disabled = true;
            button.innerHTML = '<span class="spinner"></span>';
        },
        hideSpinner: (button, text) => {
            button.disabled = false;
            button.innerHTML = text;
        },
        copyToClipboard
    };
}

export default UIManager;
