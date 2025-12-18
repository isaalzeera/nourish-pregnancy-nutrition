const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey || !geminiKey) {
    console.error('Missing keys in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiKey);

async function seed() {
    console.log("Starting AI Seeding...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    Generate 20 unique, distinct pregnancy-safe recipes as a JSON array. 
    Each object must have:
    - title: Creative name (e.g. "Iron-Power Spinach Salad")
    - image_url: A high-quality Unsplash URL relevant to the food (e.g. "https://images.unsplash.com/photo-..." with params like ?w=800).
    - macros_json: { calories (number), protein (number), carbs (number), fat (number) }
    - pregnancy_tags_array: Array of strings (e.g. ["Nausea Relief", "Third Trimester", "Iron Rich", "Calcium"])
    - description: A short 1-sentence appetizing description.
    
    Output ONLY valid JSON. No markdown backticks.
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Cleanup markdown if present
        text = text.replace(/```json/g, '').replace(/```/g, '');

        // Ensure it's a valid array
        if (text.trim().startsWith('{')) {
            text = `[${text}]`;
        }

        const recipes = JSON.parse(text);

        console.log(`Generated ${recipes.length} recipes. Inserting...`);

        const { error } = await supabase.from('recipes').insert(recipes);

        if (error) {
            console.error('Supabase Error:', error);
        } else {
            console.log('Success! Database populated.');
        }

    } catch (err) {
        console.error('Seeding Failed:', err);
        console.log("Raw Text:", err.response?.candidates?.[0]?.content?.parts?.[0]?.text);
    }
}

seed();
