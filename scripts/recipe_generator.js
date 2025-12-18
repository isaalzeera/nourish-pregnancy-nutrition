/**
 * Recipe Generator for Nourish
 * 
 * Generates pregnancy-safe recipes using Gemini AI
 * Fetches relevant images from Unsplash using AI-generated search terms
 * Saves to Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const BATCH_SIZE = 10; // Recipes per run
const MAX_RECIPES = 200; // Stop after this many total

// Keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiKey = process.env.GEMINI_API_KEY;
const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

if (!supabaseUrl || !supabaseKey || !geminiKey || !unsplashKey) {
    console.error('Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Fetch image from Unsplash with specific search term
async function getUnsplashImage(searchTerm) {
    try {
        const res = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&per_page=1&orientation=landscape`,
            { headers: { Authorization: `Client-ID ${unsplashKey}` } }
        );
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            return data.results[0].urls.regular;
        }
    } catch (err) {
        console.error('Unsplash error:', err.message);
    }
    // Fallback
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80';
}

// Generate recipes using Gemini
async function generateRecipes(count) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;

    const prompt = `Generate ${count} unique pregnancy-safe recipes as a JSON array.
Each recipe must have:
- title: Creative name (e.g. "Iron-Boost Spinach Salad")
- image_query: A specific 2-3 word search term for finding a photo of the MAIN DISH (e.g. "spinach salad bowl", "grilled salmon plate", "oatmeal berries", "chicken stir fry"). This should describe what the finished dish looks like, NOT the recipe name.
- macros_json: { calories: number, protein: number, carbs: number, fat: number }
- pregnancy_tags_array: Array of 2-3 tags from: ["Nausea Relief", "Iron Rich", "Calcium", "Folic Acid", "Omega-3", "Fiber", "Hydration", "Vitamin C", "Protein", "Energy", "Brain Development", "Bone Health"]
- description: One appetizing sentence

Output ONLY valid JSON array. No markdown, no explanation.`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await res.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Clean up markdown if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(text);
    } catch (err) {
        console.error('Gemini error:', err.message);
        return [];
    }
}

// Main function
async function main() {
    console.log('=== Nourish Recipe Generator ===\n');

    // Check current count
    const { count: currentCount } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true });

    console.log(`Current recipes in DB: ${currentCount}`);

    if (currentCount >= MAX_RECIPES) {
        console.log(`Maximum of ${MAX_RECIPES} recipes reached. Stopping.`);
        return;
    }

    const toGenerate = Math.min(BATCH_SIZE, MAX_RECIPES - currentCount);
    console.log(`Generating ${toGenerate} new recipes...\n`);

    // Generate recipes
    const recipes = await generateRecipes(toGenerate);

    if (recipes.length === 0) {
        console.log('No recipes generated. Check Gemini API.');
        return;
    }

    console.log(`Generated ${recipes.length} recipes. Fetching images...`);

    // Fetch images using AI-generated search terms
    const recipesWithImages = [];
    for (const recipe of recipes) {
        // Use the AI-generated image_query for better image matching
        const searchTerm = recipe.image_query || recipe.title;
        const imageUrl = await getUnsplashImage(searchTerm);

        // Remove image_query from final data (it's just for searching)
        const { image_query, ...recipeData } = recipe;

        recipesWithImages.push({
            ...recipeData,
            image_url: imageUrl
        });
        console.log(`  ✓ ${recipe.title} (searched: "${searchTerm}")`);
    }

    // Insert into Supabase
    console.log('\nInserting into database...');
    const { error } = await supabase.from('recipes').insert(recipesWithImages);

    if (error) {
        console.error('Supabase error:', error.message);
    } else {
        console.log(`\n✅ Successfully added ${recipesWithImages.length} recipes!`);
    }

    // Final count
    const { count: newCount } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true });
    console.log(`Total recipes now: ${newCount}`);
}

main();
