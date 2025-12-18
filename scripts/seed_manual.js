const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing keys in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log("Reading recipes.json...");
    const rawData = fs.readFileSync('./scripts/recipes.json', 'utf-8');
    const recipes = JSON.parse(rawData);

    console.log(`Inserting ${recipes.length} recipes...`);

    const { data, error } = await supabase.from('recipes').insert(recipes);

    if (error) {
        console.error('Supabase Error:', error);
    } else {
        console.log('Success! Database populated with 20 recipes.');
    }
}

seed();
