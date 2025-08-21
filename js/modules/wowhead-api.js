// A cache to store item names that have already been fetched.
const itemNameCache = new Map();

/**
 * Parses a Wowhead URL to extract its entity type and ID.
 * @param {string} url The full Wowhead URL.
 * @returns {{type: string, id: string}|null} An object with type and id, or null if no match.
 */
function parseUrl(url) {
    const match = url.match(/wowhead\.com\/(item|npc|zone|spell)=(\d+)/);
    if (match) {
        return { type: match[1], id: match[2] };
    }
    return null;
}

/**
 * Explicitly tells the Wowhead script to re-scan the document for new links to enrich.
 * This is crucial after any dynamic content update.
 */
function refreshLinks() {
    if (typeof $WowheadPower !== 'undefined') {
        $WowheadPower.refreshLinks();
    }
}

/**
 * Fetches an item's name using its ID by creating a temporary, hidden link
 * and letting the Wowhead script populate its name.
 * @param {number} itemID The ID of the item to fetch.
 * @returns {Promise<string|null>} A promise that resolves with the item's name or null if it fails.
 */
function fetchItemName(itemID) {
    return new Promise((resolve) => {
        if (itemNameCache.has(itemID)) {
            resolve(itemNameCache.get(itemID));
            return;
        }

        // Create a temporary, invisible link element (the "lure").
        const lure = document.createElement('a');
        lure.href = `https://www.wowhead.com/item=${itemID}`;
        lure.style.display = 'none';
        document.body.appendChild(lure);

        // A timeout function to handle cases where Wowhead might fail or be slow.
        const timeout = setTimeout(() => {
            document.body.removeChild(lure);
            console.error(`Timed out fetching name for item ID: ${itemID}`);
            resolve(null); // Resolve with null on failure.
        }, 2000); // 2-second timeout.

        // Use a MutationObserver to watch for when Wowhead renames the link.
        const observer = new MutationObserver((mutationsList, obs) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && lure.textContent.length > 0 && lure.textContent !== lure.href) {
                    clearTimeout(timeout);
                    const itemName = lure.textContent;
                    itemNameCache.set(itemID, itemName); // Cache the result.
                    document.body.removeChild(lure);
                    obs.disconnect(); // Clean up the observer.
                    resolve(itemName);
                    return;
                }
            }
        });

        observer.observe(lure, { childList: true });

        // Command the Wowhead script to process our new link.
        refreshLinks();
    });
}


export default {
    parseUrl,
    refreshLinks,
    fetchItemName
};
