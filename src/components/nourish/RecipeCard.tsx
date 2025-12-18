import React from "react";
import { Recipe } from "@/types";
import { Leaf, Activity, Droplets } from "lucide-react";

interface RecipeCardProps {
    recipe: Recipe;
    draggable?: boolean; // Just for visual indication if needed
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
    const [imgSrc, setImgSrc] = React.useState(recipe.image_url);

    React.useEffect(() => {
        setImgSrc(recipe.image_url);
    }, [recipe.image_url]);

    const handleError = () => {
        // Fallback to a nice gradient or specific placeholder if image fails
        setImgSrc("https://placehold.co/600x400/FF7F50/ffffff?text=Nourish+Recipe");
    };

    return (
        <div className="relative w-full h-full bg-white rounded-3xl shadow-xl overflow-hidden border border-stone-200 select-none pointer-events-none">
            {/* Image Section */}
            <div className="h-3/5 w-full relative bg-gray-100">
                <img
                    src={imgSrc}
                    alt={recipe.title}
                    onError={handleError}
                    className="w-full h-full object-cover"
                    draggable={false}
                />
                <div className="absolute top-0 right-0 p-4 flex gap-2 flex-wrap justify-end">
                    {recipe.pregnancy_tags.map((tag) => (
                        <span
                            key={tag}
                            className="bg-white/90 backdrop-blur-sm text-brand-coral px-3 py-1 rounded-full text-xs font-bold shadow-sm"
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Gradient Overlay */}
                <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            {/* Content Section */}
            <div className="h-2/5 p-6 flex flex-col justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-brand-text mb-2 line-clamp-2">
                        {recipe.title}
                    </h2>
                    <p className="text-stone-500 text-sm line-clamp-3">
                        Delicious and nutritious option for your pregnancy journey.
                        Packed with essential vitamins.
                    </p>
                </div>

                {/* Macros */}
                <div className="flex justify-between items-center text-stone-600 mt-4">
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-brand-coral text-lg">{recipe.macros.calories}</span>
                        <span className="text-xs uppercase tracking-wider">Kcal</span>
                    </div>
                    <div className="w-px h-8 bg-stone-200"></div>
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-brand-text text-lg">{recipe.macros.protein}g</span>
                        <span className="text-xs uppercase tracking-wider">Prot</span>
                    </div>
                    <div className="w-px h-8 bg-stone-200"></div>
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-brand-text text-lg">{recipe.macros.carbs}g</span>
                        <span className="text-xs uppercase tracking-wider">Carb</span>
                    </div>
                    <div className="w-px h-8 bg-stone-200"></div>
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-brand-text text-lg">{recipe.macros.fat}g</span>
                        <span className="text-xs uppercase tracking-wider">Fat</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
