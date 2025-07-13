// os/core/net.ts

// List of public CORS proxies to rotate through.
// They have different URL structures, so we use functions to format them.
const PROXIES = [
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    (url: string) => `https://yacdn.org/proxy/${url}`,
    (url: string) => `https://cors.bridged.cc/${url}`,
    (url: string) => `https://cors-anywhere.herokuapp.com/${url}`,
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`
];

/**
 * Fetches a URL through a series of CORS proxies to bypass browser restrictions.
 * It tries each proxy in order until one succeeds, returning the raw Response object.
 * This acts as the "network driver" for Lonx OS.
 * @param url The URL to fetch.
 * @returns A Promise that resolves to the Response object.
 * @throws An error if all proxies fail.
 */
export async function tryFetch(url: string): Promise<Response> {
    if (!url.startsWith('http')) {
        return Promise.reject(new Error('Invalid URL protocol. Only http/https are supported.'));
    }

    console.log(`[Net] Attempting to fetch: ${url}`);
    
    // Try direct fetch first for all URLs since many support CORS now
    console.log(`[Net] Trying direct fetch...`);
    try {
        const response = await fetch(url, {
            mode: 'cors',
            cache: 'default'
        });
        if (response.ok) {
            console.log(`[Net] Direct fetch succeeded`);
            return response;
        }
        console.log(`[Net] Direct fetch failed with status: ${response.status}`);
    } catch (error) {
        console.log(`[Net] Direct fetch failed:`, error);
    }
    
    let lastError: Error | null = null;

    for (let i = 0; i < PROXIES.length; i++) {
        const proxyBuilder = PROXIES[i];
        const proxyUrl = proxyBuilder(url);
        
        console.log(`[Net] Trying proxy ${i + 1}/${PROXIES.length}: ${proxyUrl}`);
        
        try {
            const response = await fetch(proxyUrl, {
                mode: 'cors',
                cache: 'default'
            });
            console.log(`[Net] Proxy ${i + 1} responded with status: ${response.status}`);
            
            if (response.ok) {
                console.log(`[Net] Success with proxy ${i + 1}`);
                return response; // Return the successful response object
            }
            lastError = new Error(`Proxy ${proxyUrl} returned status ${response.status}`);
        } catch (error) {
            console.log(`[Net] Proxy ${i + 1} failed:`, error);
            lastError = error as Error;
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
export async function ping(url:string): Promise<number> {
    const startTime = Date.now();
    try {
        // We don't need the response body, just the success of the fetch.
        await tryFetch(url);
        const endTime = Date.now();
        return endTime - startTime;
    } catch (e) {
        // Return -1 on error, indicating failure
        return -1;
    }
}

// yo