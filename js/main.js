document.addEventListener('DOMContentLoaded', () => {
    // DOM REFERENCES
    const magicUrlInput = document.getElementById('magicUrlInput');
    const itemNameInput = document.getElementById('itemName');
    const itemIDInput = document.getElementById('itemID');
    const npcIDsInput = document.getElementById('npcIDs');
    const itemChanceInput = document.getElementById('itemChance');
    const addItemBtn = document.getElementById('addItemBtn');
    const itemListDiv = document.getElementById('itemList');
    const generateCodeBtn = document.getElementById('generateCodeBtn');
    const outputCodeTextarea = document.getElementById('outputCode');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const inspectInput = document.getElementById('inspectInput');
    const inspectBtn = document.getElementById('inspectBtn');
    const inspectionResultDiv = document.getElementById('inspectionResult');

    let items = [];

    const refreshWowheadLinks = () => {
        if (typeof $WowheadPower !== 'undefined') {
            $WowheadPower.refreshLinks();
        }
    };

    // --- FORWARD PIPELINE: CODE GENERATION ---
    const parseWowheadUrl = (url) => url.match(/wowhead\.com\/(item|npc|zone|spell)=(\d+)/);

    const handleUrlInput = () => {
        const data = parseWowheadUrl(magicUrlInput.value);
        magicUrlInput.className = data ? 'success' : (magicUrlInput.value ? 'error' : '');
        if (data) {
            if (data[1] === 'item') itemIDInput.value = data[2];
            else if (data[1] === 'npc') npcIDsInput.value = data[2];
        }
    };

    const renderItemList = () => {
        itemListDiv.innerHTML = items.length ? '' : `<p class="placeholder-text">No items added yet.</p>`;
        items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-entry';
            const itemLink = `<a href="https://www.wowhead.com/item=${item.itemID}">${item.name || `Item ID: ${item.itemID}`}</a>`;
            const npcLinks = item.npcIDs.map(id => `<a href="https://www.wowhead.com/npc=${id}">NPC #${id}</a>`).join(', ');
            itemDiv.innerHTML = `<div class="item-info"><span>${itemLink}</span><small>From: ${npcLinks}</small></div><button class="remove-btn" data-index="${index}">Remove</button>`;
            itemListDiv.appendChild(itemDiv);
        });

        document.querySelectorAll('#itemList .remove-btn').forEach(btn => btn.addEventListener('click', e => {
            items.splice(parseInt(e.target.dataset.index, 10), 1);
            renderItemList();
        }));
        
        refreshWowheadLinks();
    };

    const addItem = () => {
        const name = itemNameInput.value.trim();
        const itemID = parseInt(itemIDInput.value, 10);
        const npcIDs = npcIDsInput.value.split(',').map(id => parseInt(id.trim(), 10)).filter(id => id > 0);
        const chance = parseInt(itemChanceInput.value, 10);
        if (!name || !itemID || npcIDs.length === 0 || !chance) {
            alert('Please ensure all manual entry fields are filled correctly.');
            return;
        }
        items.push({ name, itemID, npcIDs, chance });
        renderItemList();
        [magicUrlInput, itemNameInput, itemIDInput, npcIDsInput, itemChanceInput].forEach(i => i.value = '');
        magicUrlInput.className = '';
        magicUrlInput.focus();
    };

    const serializeToLua = (itemList) => `return {${itemList.map(item => {
        const npcTable = `{${item.npcIDs.map((id, i) => `[${i + 1}]=${id}`).join(',')},}`;
        const escapedName = item.name.replace(/"/g, '\\"');
        return `{["chance"]=${item.chance},["itemID"]=${item.itemID},["name"]="${escapedName}",["npcs"]=${npcTable},["method"]="NPC",["type"]="ITEM",}`;
    }).join(',')}}`;

    const rarityEncode = (data) => {
        const result = [];
        data.forEach(byte => {
            if (byte === 255) { result.push(255, 1); } 
            else if (byte === 0) { result.push(255, 2); } 
            else { result.push(byte); }
        });
        return new Uint8Array(result);
    };

    const generateRarityCode = () => {
        if (!items.length) { alert('Add at least one item first.'); return; }
        try {
            const luaString = serializeToLua(items);
            const compressed = pako.deflate(luaString);
            const encoded = rarityEncode(compressed);
            const binaryString = Array.from(encoded, byte => String.fromCharCode(byte)).join('');
            outputCodeTextarea.value = btoa(binaryString);
        } catch (e) {
            alert("Error generating code.");
            console.error(e);
        }
    };

    // --- REVERSE PIPELINE: CODE INSPECTION ---
    const rarityDecode = (data) => {
        const decoded = [];
        for (let i = 0; i < data.length; ) {
            if (data[i] === 255) {
                if (data[i + 1] === 1) decoded.push(255);
                else if (data[i + 1] === 2) decoded.push(0);
                i += 2;
            } else {
                decoded.push(data[i]);
                i += 1;
            }
        }
        return new Uint8Array(decoded);
    };

    const parseLuaString = (luaString) => {
        const cleanString = luaString.replace(/^return\s*\{\s*|\s*\}\s*$/g, '');
        if (cleanString.trim() === '') return [];
        const items = [];
        let braceCount = 0;
        let currentItemString = '';
        for (let i = 0; i < cleanString.length; i++) {
            const char = cleanString[i];
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            currentItemString += char;
            if (char === '}' && braceCount === 0) {
                const itemData = {};
                const nameMatch = currentItemString.match(/\["name"\]\s*=\s*"((?:\\"|[^"])*)"/);
                const itemIDMatch = currentItemString.match(/\["itemID"\]\s*=\s*(\d+)/);
                const chanceMatch = currentItemString.match(/\["chance"\]\s*=\s*(\d+)/);
                const npcsMatch = currentItemString.match(/\["npcs"\]\s*=\s*\{([^}]+)\}/);
                if (nameMatch && itemIDMatch && chanceMatch && npcsMatch) {
                    itemData.name = nameMatch[1].replace(/\\"/g, '"');
                    itemData.itemID = parseInt(itemIDMatch[1], 10);
                    itemData.chance = parseInt(chanceMatch[1], 10);
                    itemData.npcIDs = (npcsMatch[1].match(/\d+/g) || []).map(Number);
                    items.push(itemData);
                }
                currentItemString = '';
            }
        }
        return items;
    };

    const renderInspectedList = (inspectedItems) => {
        if (!inspectedItems.length) {
            inspectionResultDiv.innerHTML = `<p class="placeholder-text">No items found in the provided code.</p>`;
            return;
        }
        inspectionResultDiv.innerHTML = '';
        inspectedItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-entry';
            const itemLink = `<a href="https://www.wowhead.com/item=${item.itemID}">${item.name}</a>`;
            const npcLinks = item.npcIDs.map(id => `<a href="https://www.wowhead.com/npc=${id}">NPC #${id}</a>`).join(', ');
            itemDiv.innerHTML = `<div class="item-info"><span>${itemLink}</span><small>From: ${npcLinks} (Chance: 1 in ${item.chance})</small></div>`;
            inspectionResultDiv.appendChild(itemDiv);
        });
        refreshWowheadLinks();
    };
    
    const inspectCode = () => {
        const code = inspectInput.value.trim();
        if (!code) return;
        try {
            const binaryString = atob(code);
            const initialBytes = new Uint8Array(binaryString.length).map((_, i) => binaryString.charCodeAt(i));
            const decodedBytes = rarityDecode(initialBytes);
            const luaString = pako.inflate(decodedBytes, { to: 'string' });
            const inspectedItems = parseLuaString(luaString);
            if (!inspectedItems.length && code.length > 10) throw new Error("Could not parse items from Lua string.");
            renderInspectedList(inspectedItems);
        } catch (e) {
            inspectionResultDiv.innerHTML = `<div class="item-entry" style="color: var(--error-color);"><strong>Error:</strong> Invalid or corrupted Rarity code.</div>`;
            console.error("Inspection error:", e);
        }
    };

    // --- EVENT LISTENERS ---
    magicUrlInput.addEventListener('paste', () => setTimeout(handleUrlInput, 0));
    magicUrlInput.addEventListener('keyup', handleUrlInput);
    addItemBtn.addEventListener('click', addItem);
    generateCodeBtn.addEventListener('click', generateRarityCode);
    copyCodeBtn.addEventListener('click', () => {
        if (!outputCodeTextarea.value) return;
        outputCodeTextarea.select();
        document.execCommand('copy');
        alert('Code copied to clipboard!');
    });
    inspectBtn.addEventListener('click', inspectCode);
    
    // Initial render
    renderItemList();
});
