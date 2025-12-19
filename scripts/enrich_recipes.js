/**
 * Recipe Enrichment Script (Rate-Limited Version)
 * 
 * This script uses Gemini AI to:
 * 1. Add ingredients and instructions to recipes that are missing them
 * 2. Assign a meal_type (breakfast, morning_snack, lunch, afternoon_snack, dinner, evening_snack)
 * 
 * Run with: node --env-file=.env.local scripts/enrich_recipes.js [limit]
 * Example: node --env-file=.env.local scripts/enrich_recipes.js 20
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Get limit from command line args (default 20)
const BATCH_LIMIT = parseInt(process.argv[2]) || 20;

// Meal type definitions for AI guidance
const MEAL_TYPE_GUIDE = `
Assign ONE of these meal_type values based on when the dish is best consumed:
- "breakfast": Morning meals like oatmeal, eggs, toast, smoothies, pancakes
- "morning_snack": Light mid-morning foods like fruit, yogurt, nuts, crackers
- "lunch": Midday meals like salads, sandwiches, wraps, soups, grain bowls
- "afternoon_snack": Light afternoon foods like energy bites, smoothies, cheese, veggies
- "dinner": Evening meals like protein mains with sides, stir-fries, pasta, curries
- "evening_snack": Light pre-bed foods like warm milk, light yogurt, fruit, calcium-rich

For nausea-relief items (ginger, crackers, light), prefer "morning_snack" or "breakfast".
For energy bites and quick items, prefer "snack" times.
`;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function enrichRecipeWithRetry(recipe, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await enrichRecipe(recipe);
        } catch (error) {
            if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
                const waitTime = Math.pow(2, attempt) * 10000; // Exponential backoff
                console.log(`  ⏳ Rate limited, waiting ${waitTime / 1000}s before retry ${attempt}/${retries}...`);
                await sleep(waitTime);
            } else {
                throw error;
            }
        }
    }
    return null;
}

async function enrichRecipe(recipe) {
    const prompt = `You are a pregnancy nutrition expert. Generate complete recipe details for:

RECIPE: "${recipe.title}"
Current description: ${recipe.description || 'None'}
Tags: ${recipe.pregnancy_tags_array?.join(', ') || 'None'}
Macros: ${JSON.stringify(recipe.macros_json)}

${MEAL_TYPE_GUIDE}

Return ONLY valid JSON (no markdown, no code blocks):
{
    "ingredients": ["1 cup oatmeal", "1/2 cup milk", ...],
    "instructions": ["Step 1: Combine...", "Step 2: Cook...", ...],
    "prep_time_minutes": 10,
    "cook_time_minutes": 15,
    "meal_type": "breakfast"
}

IMPORTANT: 
- Ingredients should have quantities
- Instructions should be clear, numbered steps (5-8 steps typically)
- All ingredients must be pregnancy-safe (no raw fish, no alcohol, pasteurized dairy only)
- Choose the MOST appropriate single meal_type
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Clean up response - remove markdown code blocks if present
    let cleanJson = text.trim();
    if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }

    const parsed = JSON.parse(cleanJson);
    return {
        ingredients: parsed.ingredients || [],
        instructions: parsed.instructions || [],
        prep_time_minutes: parsed.prep_time_minutes || 10,
        cook_time_minutes: parsed.cook_time_minutes || 15,
        meal_type: parsed.meal_type || 'lunch',
    };
}

async function main() {
    console.log('🥗 Recipe Enrichment Script\n');
    console.log(`Processing up to ${BATCH_LIMIT} recipes...\n`);

    // Fetch all recipes
    const { data: allRecipes, error } = await supabase
        .from('recipes')
        .select('*');

    if (error) {
        console.error('Error fetching recipes:', error);
        return;
    }

    // Filter to those missing ingredients
    const needsEnrichment = allRecipes.filter(r => !r.ingredients || r.ingredients.length === 0);
    const batch = needsEnrichment.slice(0, BATCH_LIMIT);

    console.log(`Total recipes: ${allRecipes.length}`);
    console.log(`Missing ingredients: ${needsEnrichment.length}`);
    console.log(`Processing this batch: ${batch.length}\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < batch.length; i++) {
        const recipe = batch[i];
        console.log(`[${i + 1}/${batch.length}] Enriching: ${recipe.title}`);

        try {
            const enriched = await enrichRecipeWithRetry(recipe);

            if (enriched) {
                // Update the recipe (meal_type will be ignored if column doesn't exist)
                const { error: updateError } = await supabase
                    .from('recipes')
                    .update({
                        ingredients: enriched.ingredients,
                        instructions: enriched.instructions,
                        prep_time_minutes: enriched.prep_time_minutes,
                        cook_time_minutes: enriched.cook_time_minutes,
                    })
                    .eq('id', recipe.id);

                if (updateError) {
                    console.error(`  ❌ Update failed:`, updateError.message);
                    errorCount++;
                } else {
                    console.log(`  ✓ Enriched: ${enriched.ingredients.length} ingredients, ${enriched.instructions.length} steps (${enriched.meal_type})`);
                    successCount++;
                }
            } else {
                console.log(`  ❌ Failed after retries`);
                errorCount++;
            }
        } catch (error) {
            console.error(`  ❌ Error:`, error.message);
            errorCount++;
        }

        // Rate limiting - wait 5 seconds between API calls
        if (i < batch.length - 1) {
            await sleep(5000);
        }
    }

    const remaining = needsEnrichment.length - batch.length;
    console.log(`\n✅ Batch complete! Success: ${successCount}, Errors: ${errorCount}`);
    if (remaining > 0) {
        console.log(`📋 ${remaining} recipes remaining. Run script again to process next batch.`);
    } else {
        console.log(`🎉 All recipes have been enriched!`);
    }
}

main().catch(console.error);
