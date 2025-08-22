import { notablePacks } from './packs/notable-packs.js';
import RarityCoder from './modules/rarity-coder.js';
import UIManager from './modules/ui-manager.js';
import WowheadAPI from './modules/wowhead-api.js';

document.addEventListener('DOMContentLoaded', () => {
    let items = [];
    const ui = UIManager(document);

    function handleUrlInput() {
        const data = WowheadAPI.parseUrl(ui.elements.magicUrlInput.value);
        ui.setMagicInputState(data ? 'success' : (ui.elements.magicUrlInput.value ? 'error' : ''));
        if (data) {
            if (data.type === 'item') ui.elements.itemIDInput.value = data.id;
            else if (data.type === 'npc') ui.elements.npcIDsInput.value = data.id;
        }
    }

    async function handleAddItem() {
        let name = ui.elements.itemNameInput.value.trim();
        const itemID = parseInt(ui.elements.itemIDInput.value, 10);
        if (!itemID) { alert('Item ID is required.'); return; }

        if (!name) {
            name = await WowheadAPI.fetchItemName(itemID);
            if (!name) {
                alert(`Could not automatically fetch name for Item ID ${itemID}. Please enter it manually.`);
                return;
            }
            ui.elements.itemNameInput.value = name;
        }
        
        const type = ui.elements.itemTypeSelect.value;
        const npcIDs = ui.elements.npcIDsInput.value.split(',').map(id => parseInt(id.trim(), 10)).filter(id => id > 0);
        const chance = parseInt(ui.elements.itemChanceInput.value, 10);

        if (!name || isNaN(itemID) || npcIDs.length === 0 || isNaN(chance) || !type) {
            alert('Please ensure all required fields are filled correctly.');
            return;
        }

        items.push({ type, name, itemID, npcIDs, chance });
        ui.renderItemList(items, handleRemoveItem);
        ui.clearManualInputs();
    }
    
    function handleRemoveItem(index) {
        items.splice(index, 1);
        ui.renderItemList(items, handleRemoveItem);
    }

    function handleGenerateCode() {
        if (items.length === 0) { alert('Add at least one item first.'); return; }
        ui.elements.outputCodeTextarea.value = RarityCoder.generateCode(items);
    }

    function handleCopyCode() {
        if (!ui.elements.outputCodeTextarea.value) return;
        ui.copyToClipboard(ui.elements.outputCodeTextarea.value, "Import code copied!");
    }
    
    function handleInspectCode() {
        const code = ui.elements.inspectInput.value.trim();
        if (!code) return;
        try {
            const inspectedItems = RarityCoder.inspectCode(code);
            ui.renderInspectedList(inspectedItems);
        } catch (e) {
            ui.renderInspectionError(e);
        }
    }

    // --- Event Listeners ---
    ui.elements.magicUrlInput.addEventListener('paste', () => setTimeout(handleUrlInput, 0));
    ui.elements.magicUrlInput.addEventListener('keyup', handleUrlInput);
    ui.elements.addItemBtn.addEventListener('click', handleAddItem);
    ui.elements.generateCodeBtn.addEventListener('click', handleGenerateCode);
    ui.elements.copyCodeBtn.addEventListener('click', handleCopyCode);
    ui.elements.inspectBtn.addEventListener('click', handleInspectCode);

    ui.elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => ui.switchTab(tab.dataset.tab));
    });
    
    // --- Initial Setup ---
    ui.renderItemList(items, handleRemoveItem);
    ui.renderNotablePacks(notablePacks, 
        (packItems) => { // onAdd callback
            if (confirm("This will add the pack's items to your current list. Continue?")) {
                items.push(...packItems);
                ui.renderItemList(items, handleRemoveItem);
                ui.switchTab('generator');
            }
        },
        (code) => { // onCopy callback
            ui.copyToClipboard(code, "Pack import code copied!");
        }
    );
});
