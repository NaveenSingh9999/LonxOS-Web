// os/core/net.ts
// List of public CORS proxies to rotate through.
// They have different URL structures, so we use functions to format them.
const PROXIES = [
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    (url) => `https://yacdn.org/proxy/${url}`,
    (url) => `https://cors.bridged.cc/${url}`,
    (url) => `https://cors-anywhere.herokuapp.com/${url}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://thingproxy.freeboard.io/fetch/${url}`
];
/**
 * Fetches a URL through a series of CORS proxies to bypass browser restrictions.
 * It tries each proxy in order until one succeeds, returning the raw Response object.
 * This acts as the "network driver" for Lonx OS.
 * @param url The URL to fetch.
 * @param options Fetch options (method, body, headers, etc.)
 * @returns A Promise that resolves to the Response object.
 * @throws An error if all proxies fail.
 */
export async function tryFetch(url, options = {}) {
    if (!url.startsWith('http')) {
        return Promise.reject(new Error('Invalid URL protocol. Only http/https are supported.'));
    }
    console.log(`[Net] Attempting to fetch: ${url}`);
    
    // Default options
    const fetchOptions = {
        mode: 'cors',
        cache: 'default',
        ...options
    };
    
    // Try direct fetch first for all URLs since many support CORS now
    console.log(`[Net] Trying direct fetch...`);
    try {
        const response = await fetch(url, fetchOptions);
        if (response.ok) {
            console.log(`[Net] Direct fetch succeeded`);
            return response;
        }
        console.log(`[Net] Direct fetch failed with status: ${response.status}`);
    }
    catch (error) {
        console.log(`[Net] Direct fetch failed:`, error);
    }
    let lastError = null;
    for (let i = 0; i < PROXIES.length; i++) {
        const proxyBuilder = PROXIES[i];
        const proxyUrl = proxyBuilder(url);
        console.log(`[Net] Trying proxy ${i + 1}/${PROXIES.length}: ${proxyUrl}`);
        try {
            // For proxied requests, we may need to adjust options
            const proxyOptions = { ...fetchOptions };
            
            // Some proxies don't handle POST well, so fallback to GET for those
            if (options.method === 'POST' && i > 2) {
                console.log(`[Net] Proxy ${i + 1} - Converting POST to GET for compatibility`);
                proxyOptions.method = 'GET';
                delete proxyOptions.body;
            }
            
            const response = await fetch(proxyUrl, proxyOptions);
            console.log(`[Net] Proxy ${i + 1} responded with status: ${response.status}`);
            if (response.ok) {
                console.log(`[Net] Success with proxy ${i + 1}`);
                return response; // Return the successful response object
            }
            lastError = new Error(`Proxy ${proxyUrl} returned status ${response.status}`);
        }
        catch (error) {
            console.log(`[Net] Proxy ${i + 1} failed:`, error);
            lastError = error;
            // Try next proxy
        }
    }
    console.error(`[Net] All methods failed for ${url}`);
    throw new Error(`All CORS proxies failed for ${url}. Last error: ${lastError?.message}`);
}
/**
 * Pings a URL to measure latency using the rotating proxies.
 * @param url The URL to ping.
 * @returns A promise that resolves with the latency in milliseconds, or -1 on failure.
 */
export async function ping(url) {
    const startTime = Date.now();
    try {
        // We don't need the response body, just the success of the fetch.
        await tryFetch(url);
        const endTime = Date.now();
        return endTime - startTime;
    }
    catch (e) {
        // Return -1 on error, indicating failure
        return -1;
    }
}
// yo
