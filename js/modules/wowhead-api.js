const itemNameCache = new Map();

function parseUrl(url) {
    // This more robust regex handles subdomains (like www, es, pt) and language codes.
    const match = url.match(/(?:www\.)?wowhead\.com\/([a-z]{2}\/)?(item|npc)=(\d+)/);
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
        }, 3000); // Increased timeout for slower connections

        const observer = new MutationObserver(() => {
            // A more robust check to see if Wowhead has renamed the link
            if (lure.textContent && lure.textContent !== lure.href && !lure.textContent.includes('#')) {
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
