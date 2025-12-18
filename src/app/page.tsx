"use client";

import React, { useState, useEffect } from "react";
import { SwipeDeck } from "@/components/nourish/SwipeDeck";
import { ChatOverlay } from "@/components/nourish/ChatOverlay";
import { Recipe } from "@/types";
import { supabase } from "@/lib/supabase"; // Correct path

const Home = () => {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecipes();
    }, []);

    const fetchRecipes = async () => {
        const { data, error } = await supabase
            .from("recipes")
            .select("*")
            .limit(10); // Limit for MVP

        if (error) {
            console.error("Error fetching recipes:", error);
        } else if (data) {
            const formatted: Recipe[] = data.map((item: any) => ({
                id: item.id,
                title: item.title,
                image_url: item.image_url,
                macros: item.macros_json,
                pregnancy_tags: item.pregnancy_tags_array || [],
            }));
            setRecipes(formatted);
        }
        setLoading(false);
    };

    const handleSwipe = async (id: string, action: "liked" | "passed") => {
        console.log(`User ${action} recipe ${id}`);

        // Optimistic UI updates handled by SwipeDeck, we just fire and forget (or log error)
        // In a real app with Auth, we'd use the user's ID. 
        // For MVP with RLS "true", we might get an error if user isn't authenticated depending on policy.
        // My initialized policy was "create policy ... with check ( auth.uid() = user_id );".
        // Since we don't have Auth yet, this INSERT will fail if we try to insert a random UUID.
        // For MVP Demo purposes, I'll allow anonymous inserts or just log to console.

        // NOTE: Detailed auth/RLS implementation skipped for MVP speed as requested. 
        // We will assume the goal is to SEE the recipes and Chat first.
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-brand-softWhite overflow-hidden">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex absolute top-4 left-4">
                <p className="flex w-full justify-center border-b border-gray-300 bg-white/50 backdrop-blur-md pb-2 pt-2 lg:static lg:w-auto lg:rounded-xl lg:border lg:p-4">
                    Nourish AI &nbsp;
                    <code className="font-mono font-bold text-brand-coral">MVP</code>
                </p>
            </div>

            <div className="w-full flex justify-center items-center mt-10">
                {loading ? (
                    <div className="flex flex-col items-center gap-4 animate-pulse">
                        <div className="w-64 h-96 bg-gray-200 rounded-3xl"></div>
                        <div className="h-8 w-32 bg-gray-200 rounded-full"></div>
                    </div>
                ) : (
                    <SwipeDeck recipes={recipes} onSwipe={handleSwipe} />
                )}
            </div>

            <ChatOverlay />
        </main>
    );
};

export default Home;
