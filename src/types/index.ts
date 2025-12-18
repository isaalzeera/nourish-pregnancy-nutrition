export interface Macros {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export interface Recipe {
    id: string;
    title: string;
    image_url: string;
    macros: Macros;
    pregnancy_tags: string[]; // e.g., "Iron-Rich", "Nausea-Friendly"
    description?: string;
    ingredients?: string[];
}

export interface UserLog {
    id: string;
    user_id: string;
    recipe_id: string;
    action: 'liked' | 'passed';
    timestamp: string;
}

export interface UserProfile {
    id: string;
    name: string;
    due_date: string;
    dietary_preferences?: string[];
}
