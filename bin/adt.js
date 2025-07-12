// bin/adt.js

export default async function main(args, lonx) {
    const { shell } = lonx;
    const { proxiedFetch, ping } = lonx.net;

    if (args.length < 1) {
        shell.print("Usage: adt <url>");
        return;
    }

    const url = args[0];
    shell.print(`[adt] Resolving ${url}...`);

    try {
        const response = await proxiedFetch(url);
        
        if (!response.ok) {
            shell.print(`[adt] Error: Request failed with status ${response.status}`);
            return;
        }

        const latency = await ping(url);
        
        shell.print(`[adt] Successfully connected to ${url}`);
        shell.print(`      Status: ${response.status} ${response.statusText}`);
        shell.print(`      Latency: ${latency}ms`);
        
        // You could add more details here, like reading headers
        // const headers = response.headers;
        // for (let pair of headers.entries()) {
        //   shell.print(`      ${pair[0]}: ${pair[1]}`);
        // }

    } catch (e) {
        shell.print(`[adt] Error: ${e.message}`);
    }
}
