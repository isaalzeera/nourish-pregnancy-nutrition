/**
 * Recipe Enrichment Script (Rate-Limited Version)
 * 
 * This script uses Gemini AI to:
 * 1. Add ingredients and instructions to recipes that are missing them
 * 2. Assign an eating_context (first_thing, morning_fuel, midday_sustain, etc.)
 * 
 * Run with: node --env-file=.env.local scripts/enrich_recipes.js [limit]
 * Example: node --env-file=.env.local scripts/enrich_recipes.js 5
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

// Get limit from command line args (default 5 for rate limit safety)
const BATCH_LIMIT = parseInt(process.argv[2]) || 5;

// Eating Context Guide for AI (pregnancy-appropriate, not traditional meals)
const EATING_CONTEXT_GUIDE = `
Pregnant women eat 5-6 smaller meals throughout the day. Assign ONE eating_context value:

- "first_thing": Very light, nausea-friendly foods eaten right after waking
  Examples: crackers, dry toast, ginger tea, bland foods
  
- "morning_fuel": Energy for the day, nutritious but not heavy
  Examples: oatmeal, smoothies, yogurt parfaits, overnight oats, fruit bowls
  
- "midday_sustain": Fuller meals with balanced nutrition
  Examples: salads, grain bowls, wraps, sandwiches, soups
  
- "quick_bite": Small portions, easy grab-and-go snacks
  Examples: energy bites, nuts, hummus, cheese, fruit, crackers
  
- "substantial": Core protein-rich meals, most filling
  Examples: chicken dishes, fish, beef, pasta, stir-fries, curries
  
- "wind_down": Light, calcium-rich, calming foods for evening
  Examples: warm milk, light yogurt, cottage cheese, warm soup

RULES:
- Nausea-relief items (ginger, crackers) → "first_thing"
- Smoothies and light breakfast items → "morning_fuel"  
- Energy bites, snacks → "quick_bite"
- Heavy protein meals → "substantial"
- Anything with warm milk or calming properties → "wind_down"
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

${EATING_CONTEXT_GUIDE}

Return ONLY valid JSON (no markdown, no code blocks):
{
    "ingredients": ["1 cup oatmeal", "1/2 cup milk", ...],
    "instructions": ["Step 1: Combine...", "Step 2: Cook...", ...],
    "prep_time_minutes": 10,
    "cook_time_minutes": 15,
    "eating_context": "morning_fuel"
}

IMPORTANT: 
- Ingredients should have quantities
- Instructions should be clear steps (5-8 steps typically)
- All ingredients must be pregnancy-safe (no raw fish, no alcohol, pasteurized dairy only)
- Choose the MOST appropriate single eating_context from the list above
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
        eating_context: parsed.eating_context || 'midday_sustain',
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

    // Filter to those missing ingredients OR eating_context
    const needsEnrichment = allRecipes.filter(r =>
        !r.ingredients || r.ingredients.length === 0 || !r.eating_context
    );
    const batch = needsEnrichment.slice(0, BATCH_LIMIT);

    console.log(`Total recipes: ${allRecipes.length}`);
    console.log(`Needing enrichment: ${needsEnrichment.length}`);
    console.log(`Processing this batch: ${batch.length}\n`);

    if (batch.length === 0) {
        console.log('🎉 All recipes are already enriched!');
        return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < batch.length; i++) {
        const recipe = batch[i];
        console.log(`[${i + 1}/${batch.length}] Enriching: ${recipe.title}`);

        try {
            const enriched = await enrichRecipeWithRetry(recipe);

            if (enriched) {
                // Update the recipe with all fields including eating_context
                const { error: updateError } = await supabase
                    .from('recipes')
                    .update({
                        ingredients: enriched.ingredients,
                        instructions: enriched.instructions,
                        prep_time_minutes: enriched.prep_time_minutes,
                        cook_time_minutes: enriched.cook_time_minutes,
                        eating_context: enriched.eating_context,
                    })
                    .eq('id', recipe.id);

                if (updateError) {
                    console.error(`  ❌ Update failed:`, updateError.message);
                    errorCount++;
                } else {
                    console.log(`  ✓ Enriched: ${enriched.ingredients.length} ingredients, ${enriched.instructions.length} steps → ${enriched.eating_context}`);
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

        // Rate limiting - wait 6 seconds between API calls
        if (i < batch.length - 1) {
            await sleep(6000);
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
