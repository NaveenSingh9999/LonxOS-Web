// test-network.js - Simple network test

import { tryFetch } from './os/core/net.js';

async function testNetwork() {
    try {
        console.log('Testing network functionality...');
        
        const testUrl = 'https://naveensingh9999.github.io/standard-module-lib-lonxos/packages/man.js';
        console.log(`Testing URL: ${testUrl}`);
        
        const response = await tryFetch(testUrl);
        const content = await response.text();
        
        console.log('SUCCESS! Network test passed.');
        console.log(`Response status: ${response.status}`);
        console.log(`Content length: ${content.length} characters`);
        console.log('First 200 characters:', content.substring(0, 200));
        
    } catch (error) {
        console.error('FAILED! Network test failed:', error);
    }
}

// Run the test
testNetwork();
