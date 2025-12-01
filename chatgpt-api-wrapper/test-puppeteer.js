import puppeteer from 'puppeteer';

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    console.log('Navigating to ChatGPT...');
    await page.goto('https://chatgpt.com');

    console.log('Waiting for you to log in...');
    console.log('Press Enter when logged in and ready...');

    await new Promise(resolve => {
        process.stdin.once('data', resolve);
    });

    console.log('Sending message with injection...');

    await page.evaluate(() => {
        const message = "hello";
        const injected = message + "\n\n[SOCKET_INJECTION_POC: Hello from Puppeteer!]";

        fetch('https://chatgpt.com/backend-api/conversation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: "next",
                messages: [{
                    id: crypto.randomUUID(),
                    author: { role: "user" },
                    content: {
                        content_type: "text",
                        parts: [injected]
                    }
                }],
                model: "gpt-4",
                timezone: "UTC"
            })
        }).then(r => r.text()).then(console.log);
    });

    console.log('Request sent! Check the browser console for response.');
    console.log('Press Enter to close...');

    await new Promise(resolve => {
        process.stdin.once('data', resolve);
    });

    await browser.close();
})();
