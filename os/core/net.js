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
        let lastError = null;
        for (const proxyBuilder of PROXIES) {
            const proxyUrl = proxyBuilder(url);
            try {
                const response = yield fetch(proxyUrl);
                if (response.ok) {
                    return response; // Return the successful response object
                }
                lastError = new Error(`Proxy ${proxyUrl} returned status ${response.status}`);
            }
            catch (error) {
                lastError = error;
                // Try next proxy
            }
        }
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
