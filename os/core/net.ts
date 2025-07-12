// os/core/net.ts

// List of public CORS proxies to rotate through.
// They have different URL structures, so we use functions to format them.
const PROXIES = [
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
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

    let lastError: Error | null = null;

    for (const proxyBuilder of PROXIES) {
        const proxyUrl = proxyBuilder(url);
        try {
            const response = await fetch(proxyUrl);
            if (response.ok) {
                return response; // Return the successful response object
            }
            lastError = new Error(`Proxy ${proxyUrl} returned status ${response.status}`);
        } catch (error) {
            lastError = error as Error;
            // Try next proxy
        }
    }

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
