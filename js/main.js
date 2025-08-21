import { notablePacks } from './packs/notable-packs.js';
import * RarityCoder from './modules/rarity-coder.js';
import * UIManager from './modules/ui-manager.js';
import * WowheadAPI from './modules/wowhead-api.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    let items = [];
    const ui = UIManager(document);
    const githubRepoURL = "https://github.com/asadomeio/Rarity-generator"; // Replace with your actual repo URL

    // --- Core Event Listeners ---
    ui.elements.magicUrlInput.addEventListener('paste', () => setTimeout(handleUrlInput, 0));
    ui.elements.magicUrlInput.addEventListener('keyup', handleUrlInput);
    ui.elements.addItemBtn.addEventListener('click', handleAddItem);
    ui.elements.generateCodeBtn.addEventListener('click', handleGenerateCode);
    ui.elements.copyCodeBtn.addEventListener('click', handleCopyCode);
    ui.elements.inspectBtn.addEventListener('click', handleInspectCode);

    // --- Tab Navigation ---
    ui.elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            ui.switchTab(tabName);
        });
    });

    // --- Suggestion Modal Listeners ---
    ui.elements.suggestPackBtn.addEventListener('click', () => ui.openSuggestionModal());
    ui.elements.modalCloseBtn.addEventListener('click', () => ui.closeSuggestionModal());
    ui.elements.modalOverlay.addEventListener('click', (e) => {
        if (e.target === ui.elements.modalOverlay) {
            ui.closeSuggestionModal();
        }
    });
    ui.elements.generateSuggestionBtn.addEventListener('click', handleGenerateSuggestion);
    ui.elements.copySubmissionBtn.addEventListener('click', () => {
        ui.copyToClipboard(ui.elements.submissionCode.value, "Submission code copied!");
    });
    
    // --- Handler Functions ---
    const handleUrlInput = () => {
        const data = WowheadAPI.parseUrl(ui.elements.magicUrlInput.value);
        ui.setMagicInputState(data ? 'success' : (ui.elements.magicUrlInput.value ? 'error' : ''));
        if (data) {
            if (data.type === 'item') ui.elements.itemIDInput.value = data.id;
            else if (data.type === 'npc') ui.elements.npcIDsInput.value = data.id;
        }
    };

    const handleAddItem = async () => {
        const itemID = parseInt(ui.elements.itemIDInput.value, 10);
        if (!itemID) {
            alert('Item ID is required.');
            return;
        }

        ui.showSpinner(ui.elements.addItemBtn);
        const name = await WowheadAPI.fetchItemName(itemID);
        ui.hideSpinner(ui.elements.addItemBtn, "Add Item to List");
        
        if (!name) {
            alert(`Could not automatically fetch the name for Item ID ${itemID}. Please enter it manually.`);
            return;
        }
        ui.elements.itemNameInput.value = name;
        
        const npcIDs = ui.elements.npcIDsInput.value.split(',').map(id => parseInt(id.trim(), 10)).filter(id => id > 0);
        const chance = parseInt(ui.elements.itemChanceInput.value, 10);

        if (!name || isNaN(itemID) || npcIDs.length === 0 || isNaN(chance) || chance <= 0) {
            alert('Please ensure all manual entry fields are filled correctly.');
            return;
        }

        items.push({ name, itemID, npcIDs, chance });
        ui.renderItemList(items, (index) => {
            items.splice(index, 1);
            ui.renderItemList(items, () => {});
        });
        ui.clearManualInputs();
    };

    const handleGenerateCode = () => {
        if (items.length === 0) {
            alert('Add at least one item to the list before generating the code.');
            return;
        }
        const code = RarityCoder.generateCode(items);
        ui.elements.outputCodeTextarea.value = code;
    };

    const handleCopyCode = () => {
        if (!ui.elements.outputCodeTextarea.value) return;
        ui.copyToClipboard(ui.elements.outputCodeTextarea.value, "Import code copied!");
    };
    
    const handleInspectCode = () => {
        const code = ui.elements.inspectInput.value.trim();
        if (!code) return;
        try {
            const inspectedItems = RarityCoder.inspectCode(code);
            if (!inspectedItems.length && code.length > 10) throw new Error("Could not parse items from Lua string.");
            ui.renderInspectedList(inspectedItems);
        } catch (e) {
            ui.renderInspectionError(e);
        }
    };

    const handleGenerateSuggestion = () => {
        const title = ui.elements.packTitle.value.trim();
        const author = ui.elements.packAuthor.value.trim();
        const icon = ui.elements.packIcon.value.trim();
        if (!title || !author) {
            alert('Pack Title and Author Name are required.');
            return;
        }
        
        const packData = { title, author, icon, items };
        const submissionText = ui.generateSubmissionText(packData, RarityCoder.generateCode(items));
        ui.showSubmissionContent(submissionText, githubRepoURL);
    };

    // --- Initial Setup ---
    ui.renderItemList(items, () => {});
    ui.renderNotablePacks(notablePacks, (packItems) => {
        if (confirm("This will add the pack's items to your current list. Continue?")) {
            items.push(...packItems);
            ui.renderItemList(items, (index) => {
                items.splice(index, 1);
                ui.renderItemList(items, () => {});
            });
            ui.switchTab('generator');
        }
    }, (code) => {
        ui.copyToClipboard(code, "Pack import code copied!");
    });
});
