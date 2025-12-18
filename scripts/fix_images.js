/**
 * Image Validator & Fixer for Nourish Recipes
 * 
 * This script:
 * 1. Fetches all recipes from Supabase
 * 2. Tests each image URL
 * 3. Replaces broken URLs with working food images
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase keys');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Reliable food image alternatives (verified working Unsplash URLs)
const FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80", // Salad bowl
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80", // Pancakes
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80", // Colorful salad
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80", // Pizza
    "https://images.unsplash.com/photo-1482049016gy9-b7294dcef490?w=800&q=80", // Soup
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80", // Plate with food
    "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80", // Breakfast
    "https://images.unsplash.com/photo-1499028344343-cd173ffc68a9?w=800&q=80", // Tacos
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80", // Pasta
    "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&q=80", // French toast
];

async function testImageUrl(url) {
    try {
        const res = await fetch(url, { method: 'HEAD', timeout: 5000 });
        return res.ok;
    } catch {
        return false;
    }
}

async function main() {
    console.log("Fetching recipes from database...\n");

    const { data: recipes, error } = await supabase
        .from('recipes')
        .select('id, title, image_url');

    if (error) {
        console.error("Error fetching recipes:", error);
        return;
    }

    console.log(`Found ${recipes.length} recipes. Testing images...\n`);

    let brokenCount = 0;
    let fixedCount = 0;

    for (const recipe of recipes) {
        const isValid = await testImageUrl(recipe.image_url);

        if (!isValid) {
            brokenCount++;
            console.log(`❌ Broken: ${recipe.title}`);

            // Pick a random fallback image
            const newUrl = FALLBACK_IMAGES[fixedCount % FALLBACK_IMAGES.length];

            // Update in database
            const { error: updateError } = await supabase
                .from('recipes')
                .update({ image_url: newUrl })
                .eq('id', recipe.id);

            if (updateError) {
                console.log(`   Failed to update: ${updateError.message}`);
            } else {
                console.log(`   ✓ Fixed with new image`);
                fixedCount++;
            }
        } else {
            console.log(`✓ OK: ${recipe.title}`);
        }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total recipes: ${recipes.length}`);
    console.log(`Broken images: ${brokenCount}`);
    console.log(`Fixed: ${fixedCount}`);
}

main();
