"use client";

import React, { useState } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Recipe } from "@/types";
import { RecipeCard } from "./RecipeCard";
import { X, Heart, RefreshCcw } from "lucide-react";

interface SwipeDeckProps {
    recipes: Recipe[];
    onSwipe: (recipeId: string, action: "liked" | "passed") => void;
}

export const SwipeDeck: React.FC<SwipeDeckProps> = ({ recipes, onSwipe }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [exitX, setExitX] = useState<number | null>(null);

    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);

    // Color overlays for swipe feedback
    const likeOpacity = useTransform(x, [50, 150], [0, 1]);
    const passOpacity = useTransform(x, [-50, -150], [0, 1]);

    const currentRecipe = recipes[currentIndex];

    const handleDragEnd = (e: any, info: PanInfo) => {
        if (info.offset.x > 100) {
            setExitX(200);
            onSwipe(currentRecipe.id, "liked");
            setTimeout(() => advanceCard(), 200);
        } else if (info.offset.x < -100) {
            setExitX(-200);
            onSwipe(currentRecipe.id, "passed");
            setTimeout(() => advanceCard(), 200);
        }
    };

    const advanceCard = () => {
        setCurrentIndex((prev) => prev + 1);
        setExitX(null);
        x.set(0);
    };

    if (!currentRecipe) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-white/50 backdrop-blur-xl rounded-3xl border border-white shadow-xl">
                <div className="bg-brand-coral/10 p-6 rounded-full mb-4">
                    <Heart className="w-12 h-12 text-brand-coral" />
                </div>
                <h3 className="text-2xl font-bold text-brand-text mb-2">Wait, you're all caught up!</h3>
                <p className="text-stone-500 mb-6">Check back later for more delicious pregnancy-safe recipes.</p>
                <button
                    onClick={() => setCurrentIndex(0)}
                    className="flex items-center gap-2 text-brand-coral hover:text-brand-coral/80 font-bold"
                >
                    <RefreshCcw className="w-4 h-4" /> Start Over
                </button>
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-sm h-[600px] flex flex-col items-center">
            <div className="relative w-full h-full">
                {/* Next Card (Behind) */}
                {recipes[currentIndex + 1] && (
                    <div className="absolute top-0 left-0 w-full h-full scale-[0.95] translate-y-4 opacity-70 z-0">
                        <RecipeCard recipe={recipes[currentIndex + 1]} />
                    </div>
                )}

                {/* Current Card (Draggable) */}
                <motion.div
                    style={{ x, rotate, opacity: exitX ? 0 : 1 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={handleDragEnd}
                    animate={exitX ? { x: exitX, opacity: 0 } : { x: 0, opacity: 1 }}
                    className="absolute top-0 left-0 w-full h-full cursor-grab active:cursor-grabbing z-10"
                >
                    <RecipeCard recipe={currentRecipe} />

                    {/* LIKE OVERLAY */}
                    <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-8 border-4 border-green-500 rounded-lg px-4 py-2 -rotate-12 z-20 pointer-events-none">
                        <span className="text-green-500 font-bold text-4xl uppercase tracking-widest">YUM</span>
                    </motion.div>

                    {/* PASS OVERLAY */}
                    <motion.div style={{ opacity: passOpacity }} className="absolute top-8 right-8 border-4 border-red-500 rounded-lg px-4 py-2 rotate-12 z-20 pointer-events-none">
                        <span className="text-red-500 font-bold text-4xl uppercase tracking-widest">NOPE</span>
                    </motion.div>
                </motion.div>
            </div>

            {/* Controls */}
            <div className="mt-8 flex gap-6">
                <button
                    onClick={() => { setExitX(-200); onSwipe(currentRecipe.id, "passed"); setTimeout(advanceCard, 200); }}
                    className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-red-500 hover:scale-110 transition-transform"
                >
                    <X className="w-8 h-8" />
                </button>
                <button
                    onClick={() => { setExitX(200); onSwipe(currentRecipe.id, "liked"); setTimeout(advanceCard, 200); }}
                    className="w-16 h-16 bg-gradient-to-tr from-brand-coral to-orange-400 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform"
                >
                    <Heart className="w-8 h-8 fill-current" />
                </button>
            </div>
        </div>
    );
};
