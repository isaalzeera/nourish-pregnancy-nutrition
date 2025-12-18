const fs = require("fs");
require("dotenv").config({ path: ".env.local" });

const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";

async function test(modelName) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    console.log("Testing:", modelName);

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: "Hi" }] }]
        })
    });

    const data = await res.json();
    console.log("Status:", res.status);

    if (res.ok) {
        console.log("SUCCESS:", data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 100));
        return true;
    } else {
        console.log("Error:", data.error?.message?.substring(0, 100));
        return false;
    }
}

async function run() {
    // Try models that might have different quota
    const models = ["gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-pro-latest"];

    for (const m of models) {
        const ok = await test(m);
        if (ok) {
            console.log("\n>>> WORKING MODEL:", m);
            break;
        }
        console.log("");
    }
}

run();
