const itemNameCache = new Map();

function parseUrl(url) {
    const match = url.match(/wowhead\.com\/([a-z]{2}\/)?(item|npc)=(\d+)/);
    if (match) {
        // match[2] is the type ('item' or 'npc'), match[3] is the ID
        return { type: match[2], id: match[3] };
    }
    return null;
}

function refreshLinks() {
    if (typeof $WowheadPower !== 'undefined') {
        $WowheadPower.refreshLinks();
    }
}

function fetchItemName(itemID) {
    return new Promise((resolve) => {
        if (itemNameCache.has(itemID)) {
            resolve(itemNameCache.get(itemID));
            return;
        }

        const lure = document.createElement('a');
        lure.href = `https://www.wowhead.com/item=${itemID}`;
        lure.style.display = 'none';
        document.body.appendChild(lure);

        const timeout = setTimeout(() => {
            document.body.removeChild(lure);
            console.error(`Timed out fetching name for item ID: ${itemID}`);
            resolve(null);
        }, 2000);

        const observer = new MutationObserver(() => {
            if (lure.textContent && !lure.textContent.includes('#')) {
                clearTimeout(timeout);
                const itemName = lure.textContent;
                itemNameCache.set(itemID, itemName);
                document.body.removeChild(lure);
                observer.disconnect();
                resolve(itemName);
            }
        });

        observer.observe(lure, { childList: true, characterData: true, subtree: true });
        refreshLinks();
    });
}

export default { parseUrl, refreshLinks, fetchItemName };
