function serializeToLua(itemList) {
    const itemsString = itemList.map(item => {
        const npcTable = `{${item.npcIDs.map((id, i) => `[${i + 1}]=${id}`).join(',')},}`;
        const escapedName = item.name.replace(/"/g, '\\"');
        return `{["type"]="${item.type}",["chance"]=${item.chance},["itemID"]=${item.itemID},["name"]="${escapedName}",["npcs"]=${npcTable},["method"]="NPC",}`;
    }).join(',');
    return `return {${itemsString}}`;
}

function rarityEncode(data) {
    const result = [];
    data.forEach(byte => {
        if (byte === 255) { result.push(255, 1); } 
        else if (byte === 0) { result.push(255, 2); } 
        else { result.push(byte); }
    });
    return new Uint8Array(result);
}

function generateCode(items) {
    try {
        const luaString = serializeToLua(items);
        const compressed = pako.deflate(luaString);
        const encoded = rarityEncode(compressed);
        const binaryString = Array.from(encoded, byte => String.fromCharCode(byte)).join('');
        return btoa(binaryString);
    } catch (e) {
        console.error("Error generating code:", e);
        return "Error: Could not generate code.";
    }
}

function rarityDecode(data) {
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
}

function parseLuaString(luaString) {
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
            const typeMatch = currentItemString.match(/\["type"\]\s*=\s*"([^"]+)"/);
            if (nameMatch && itemIDMatch && chanceMatch && npcsMatch) {
                itemData.name = nameMatch[1].replace(/\\"/g, '"');
                itemData.itemID = parseInt(itemIDMatch[1], 10);
                itemData.chance = parseInt(chanceMatch[1], 10);
                itemData.npcIDs = (npcsMatch[1].match(/\d+/g) || []).map(Number);
                itemData.type = typeMatch ? typeMatch[1] : 'ITEM';
                items.push(itemData);
            }
            currentItemString = '';
        }
    }
    return items;
}

function inspectCode(code) {
    const binaryString = atob(code);
    const initialBytes = new Uint8Array(binaryString.length).map((_, i) => binaryString.charCodeAt(i));
    const decodedBytes = rarityDecode(initialBytes);
    const luaString = pako.inflate(decodedBytes, { to: 'string' });
    return parseLuaString(luaString);
}

export default { generateCode, inspectCode };
