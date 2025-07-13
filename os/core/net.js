// os/core/net.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
 * @returns A Promise that resolves to the Response object.
 * @throws An error if all proxies fail.
 */
export function tryFetch(url) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!url.startsWith('http')) {
            return Promise.reject(new Error('Invalid URL protocol. Only http/https are supported.'));
        }
        console.log(`[Net] Attempting to fetch: ${url}`);
        // Try direct fetch first for all URLs since many support CORS now
        console.log(`[Net] Trying direct fetch...`);
        try {
            const response = yield fetch(url, {
                mode: 'cors',
                cache: 'default'
            });
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
                const response = yield fetch(proxyUrl, {
                    mode: 'cors',
                    cache: 'default'
                });
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
        throw new Error(`All CORS proxies failed for ${url}. Last error: ${lastError === null || lastError === void 0 ? void 0 : lastError.message}`);
    });
}
/**
 * Pings a URL to measure latency using the rotating proxies.
 * @param url The URL to ping.
 * @returns A promise that resolves with the latency in milliseconds, or -1 on failure.
 */
export function ping(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const startTime = Date.now();
        try {
            // We don't need the response body, just the success of the fetch.
            yield tryFetch(url);
            const endTime = Date.now();
            return endTime - startTime;
        }
        catch (e) {
            // Return -1 on error, indicating failure
            return -1;
        }
    });
}
// yo
