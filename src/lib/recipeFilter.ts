/**
 * Smart Recipe Filtering for Pregnancy Meal Recommendations
 * 
 * Classifies meals by EATING CONTEXT (not traditional breakfast/lunch/dinner)
 * because pregnant women eat 5-6 smaller meals throughout the day.
 */

import { Recipe } from "@/types";

// Eating Context Types (Option 1 - Primary Classification)
export type EatingContext =
    | "first_thing"     // Very light, nausea-friendly, right after waking
    | "morning_fuel"    // Energy for the day, nutritious but not heavy
    | "midday_sustain"  // Fuller meals with protein and nutrients
    | "quick_bite"      // Small portions, easy grab-and-go
    | "substantial"     // Core protein meals
    | "wind_down";      // Light, calcium-rich, calming

// Purpose Types (Option 3 - Secondary Description)
export type MealPurpose =
    | "nausea_relief"   // Ginger, crackers, bland, easy to digest
    | "energy"          // Carbs + protein for sustained energy
    | "nutrient_dense"  // High in iron, folate, calcium
    | "hydrating";      // Water-rich foods, soups, smoothies

// Configuration for each eating context
export const EATING_CONTEXT_CONFIG: Record<EatingContext, {
    label: string;
    description: string;
    keywords: string[];
    maxCalories: number;
    priorityPurposes: MealPurpose[];
}> = {
    first_thing: {
        label: "First Thing",
        description: "Light & gentle on the stomach",
        keywords: ["crackers", "toast", "ginger", "tea", "dry", "bland", "light"],
        maxCalories: 200,
        priorityPurposes: ["nausea_relief"],
    },
    morning_fuel: {
        label: "Morning Fuel",
        description: "Energy to start your day",
        keywords: ["oatmeal", "smoothie", "yogurt", "fruit", "granola", "banana", "overnight"],
        maxCalories: 400,
        priorityPurposes: ["energy", "nutrient_dense"],
    },
    midday_sustain: {
        label: "Midday Sustain",
        description: "Balanced nutrition",
        keywords: ["salad", "bowl", "wrap", "sandwich", "quinoa", "lunch", "soup"],
        maxCalories: 500,
        priorityPurposes: ["nutrient_dense", "energy"],
    },
    quick_bite: {
        label: "Quick Bite",
        description: "Easy grab-and-go",
        keywords: ["bites", "snack", "nuts", "hummus", "energy", "small", "mini", "crackers"],
        maxCalories: 250,
        priorityPurposes: ["energy"],
    },
    substantial: {
        label: "Substantial Meal",
        description: "Protein-rich nourishment",
        keywords: ["chicken", "salmon", "fish", "beef", "steak", "dinner", "pasta", "stir-fry", "curry"],
        maxCalories: 600,
        priorityPurposes: ["nutrient_dense"],
    },
    wind_down: {
        label: "Wind Down",
        description: "Calm & calcium-rich",
        keywords: ["milk", "warm", "cheese", "cottage", "yogurt", "light", "evening"],
        maxCalories: 300,
        priorityPurposes: ["hydrating"],
    },
};

// Map meal number to eating context
// Meal 1 = first_thing, Meal 2 = morning_fuel, etc.
export function getContextForMealNumber(mealNumber: number): EatingContext {
    // Pregnant women typically eat 5-6 meals per day
    switch (mealNumber) {
        case 1:
            return "first_thing";      // Waking up - gentle on stomach
        case 2:
            return "morning_fuel";     // Getting energy for the day
        case 3:
            return "midday_sustain";   // Midday nutrition
        case 4:
            return "quick_bite";       // Afternoon pick-me-up
        case 5:
            return "substantial";      // Main evening meal
        default:
            return "wind_down";        // Late evening, before bed
    }
}

// Detect meal purpose from recipe tags
function detectPurpose(recipe: Recipe): MealPurpose[] {
    const purposes: MealPurpose[] = [];
    const tags = recipe.pregnancy_tags.map(t => t.toLowerCase());
    const title = recipe.title.toLowerCase();

    if (tags.some(t => t.includes("nausea")) || title.includes("ginger") || title.includes("bland")) {
        purposes.push("nausea_relief");
    }
    if (tags.some(t => t.includes("energy") || t.includes("protein"))) {
        purposes.push("energy");
    }
    if (tags.some(t => t.includes("iron") || t.includes("folic") || t.includes("calcium"))) {
        purposes.push("nutrient_dense");
    }
    if (tags.some(t => t.includes("hydrat")) || title.includes("soup") || title.includes("smoothie")) {
        purposes.push("hydrating");
    }

    return purposes.length > 0 ? purposes : ["energy"]; // Default to energy
}

/**
 * Score a recipe based on how well it fits the current eating context
 */
export function scoreRecipeForContext(recipe: Recipe, context: EatingContext): number {
    const config = EATING_CONTEXT_CONFIG[context];
    let score = 0;

    // Check title for context keywords
    const titleLower = recipe.title.toLowerCase();
    for (const keyword of config.keywords) {
        if (titleLower.includes(keyword)) {
            score += 15;
        }
    }

    // Check tags for keywords
    for (const tag of recipe.pregnancy_tags) {
        const tagLower = tag.toLowerCase();
        for (const keyword of config.keywords) {
            if (tagLower.includes(keyword)) {
                score += 10;
            }
        }
    }

    // Calorie appropriateness
    const calories = recipe.macros.calories || 0;
    if (calories <= config.maxCalories) {
        score += 10;
    } else if (calories > config.maxCalories * 1.5) {
        score -= 15; // Penalize meals that are too heavy for this context
    }

    // Purpose alignment
    const purposes = detectPurpose(recipe);
    for (const purpose of config.priorityPurposes) {
        if (purposes.includes(purpose)) {
            score += 20;
        }
    }

    // Special cases
    if (context === "first_thing") {
        // Strongly favor nausea-relief for first meal
        if (titleLower.includes("ginger") || titleLower.includes("cracker")) {
            score += 30;
        }
        // Penalize heavy/fatty foods
        if (recipe.macros.fat > 15 || calories > 300) {
            score -= 25;
        }
    }

    if (context === "wind_down") {
        // Favor calcium-rich for wind-down
        if (titleLower.includes("milk") || titleLower.includes("yogurt") || titleLower.includes("cheese")) {
            score += 20;
        }
    }

    return score;
}

/**
 * Get smart recipe suggestions for the current meal number
 */
export function getSmartRecipesForMeal(
    recipes: Recipe[],
    mealNumber: number,
    excludeIds: Set<string>
): Recipe[] {
    const context = getContextForMealNumber(mealNumber);

    // Filter out already eaten recipes
    const available = recipes.filter((r) => !excludeIds.has(r.id));

    // Score and sort by relevance to this eating context
    const scored = available.map((recipe) => ({
        recipe,
        score: scoreRecipeForContext(recipe, context),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.map((s) => s.recipe);
}

/**
 * Get the context info for display in UI
 */
export function getContextInfo(mealNumber: number) {
    const context = getContextForMealNumber(mealNumber);
    const config = EATING_CONTEXT_CONFIG[context];
    return {
        context,
        label: config.label,
        description: config.description,
    };
}
