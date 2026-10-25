/* Seed content. Shapes mirror app/models/recipe.py so API results drop straight in.
   nutrition_total is for the whole recipe; per serving = total / servings.
   videoUrl points at the demo reels hosted on Cloudinary; the delivery URL is
   normalized to H.264 MP4 (f_mp4,vc_h264) so it plays in every browser
   regardless of the source codec/container. */
const SEED_RECIPES = [
  {
    id: 'beef-pasta', title: 'Creamy Beef Tomato Pasta', creator: 'nurish.kitchen', servings: 4, shelfDays: 3,
    caption: 'Ground beef, a creamy tomato sauce, and twirly pasta. One skillet, weeknight easy.',
    tags: ['beef', 'pasta', 'dinner'], likes: 3184, palette: ['#D9452F', '#7A2A24', '#E08A2B', '#F0C27B', '#1B1412'],
    videoUrl: 'https://res.cloudinary.com/az96zvxn/video/upload/f_mp4,vc_h264/v1792943111/reel-1.mp4.mp4',
    ingredients: [
      { name: 'ground beef', quantity: 1, unit: 'lb' },
      { name: 'onion', quantity: 1, unit: '', note: 'small, diced' },
      { name: 'red bell pepper', quantity: 1, unit: '', note: 'diced' },
      { name: 'garlic cloves', quantity: 4, unit: '', note: 'minced' },
      { name: 'tomato paste', quantity: 3, unit: 'tbsp' },
      { name: 'beef broth', quantity: 2, unit: 'cups' },
      { name: 'heavy cream', quantity: 1, unit: 'cup' },
      { name: 'fusilli or rotini pasta', quantity: 12, unit: 'oz' },
      { name: 'italian seasoning', quantity: 1, unit: 'tsp' },
      { name: 'olive oil', quantity: 1, unit: 'tbsp' }
    ],
    steps: [
      { number: 1, instruction: 'Heat a little olive oil in a large skillet. Add the diced onion and red bell pepper and cook until softened.' },
      { number: 2, instruction: 'Add the ground beef and cook until browned, breaking it up as it cooks. Season to taste.' },
      { number: 3, instruction: 'Stir in the tomato paste, then add the beef broth and mix until the paste is incorporated.' },
      { number: 4, instruction: 'Pour in the heavy cream and stir into a creamy tomato sauce.' },
      { number: 5, instruction: 'Meanwhile, boil the pasta in salted water until al dente, then drain.' },
      { number: 6, instruction: 'Add the pasta to the skillet and stir until thoroughly coated in the sauce.' },
      { number: 7, instruction: 'Let everything come together for a minute or two, then serve warm.' }
    ],
    nutrition_total: { calories: 2960, protein_g: 128, fat_g: 168, carbs_g: 248, fiber_g: 16, sugar_g: 28, sodium_mg: 3200 }
  },
  {
    id: 'coconut-chicken', title: 'Creamy Coconut Chicken', creator: 'nurish.kitchen', servings: 3, shelfDays: 3,
    caption: 'Tender seasoned chicken in a rich, savory coconut sauce over fluffy rice. Easy comfort. 🥥🍗',
    tags: ['chicken', 'rice', 'coconut'], likes: 4120, palette: ['#E6C79C', '#B5793F', '#E0A43B', '#F4E3C1', '#2B2017'],
    videoUrl: 'https://res.cloudinary.com/az96zvxn/video/upload/f_mp4,vc_h264/v1792943153/reel-2.mp4.mp4',
    ingredients: [
      { name: 'boneless chicken thighs', quantity: 1, unit: 'lb' },
      { name: 'paprika', quantity: 1, unit: 'tsp' },
      { name: 'garlic powder', quantity: 1, unit: 'tsp' },
      { name: 'salt', quantity: 0.5, unit: 'tsp' },
      { name: 'black pepper', quantity: 0.5, unit: 'tsp' },
      { name: 'oil', quantity: 1, unit: 'tbsp' },
      { name: 'garlic cloves', quantity: 3, unit: '', note: 'minced' },
      { name: 'onion', quantity: 1, unit: '', note: 'small, diced' },
      { name: 'curry paste', quantity: 1, unit: 'tbsp', note: 'or paprika' },
      { name: 'coconut milk', quantity: 1, unit: 'cup' },
      { name: 'chicken broth', quantity: 0.5, unit: 'cup' },
      { name: 'cooked white rice', quantity: 3, unit: 'cups' },
      { name: 'green onions', quantity: 2, unit: '', note: 'for garnish' }
    ],
    steps: [
      { number: 1, instruction: 'Season the chicken with paprika, garlic powder, salt and pepper, massaging it in.' },
      { number: 2, instruction: 'Heat oil in a skillet and sear the chicken on both sides until golden. Remove and set aside.' },
      { number: 3, instruction: 'Sauté the onion and garlic in the same skillet.' },
      { number: 4, instruction: 'Add the curry paste (or paprika), then the coconut milk and chicken broth.' },
      { number: 5, instruction: 'Simmer until the sauce begins to thicken.' },
      { number: 6, instruction: 'Return the chicken to the skillet and cook until it reaches 165°F internally.' },
      { number: 7, instruction: 'Slice the chicken and serve over rice with the coconut sauce and green onions.' }
    ],
    nutrition_total: { calories: 1980, protein_g: 108, fat_g: 96, carbs_g: 168, fiber_g: 8, sugar_g: 10, sodium_mg: 2400 }
  },
  {
    id: 'garlic-soy-chicken', title: 'Garlic Soy Glazed Chicken', creator: 'nurish.kitchen', servings: 3, shelfDays: 3,
    caption: 'Crispy chicken thighs in a glossy sweet-and-savory garlic soy glaze over rice. 🍚🍗',
    tags: ['chicken', 'rice', 'asian'], likes: 5260, palette: ['#8A4B2C', '#4A2616', '#E0A43B', '#C98B4A', '#1A120C'],
    videoUrl: 'https://res.cloudinary.com/az96zvxn/video/upload/f_mp4,vc_h264/v1792943440/reel-3.mp4.mov',
    ingredients: [
      { name: 'boneless chicken thighs', quantity: 1, unit: 'lb' },
      { name: 'cornstarch', quantity: 0.33, unit: 'cup' },
      { name: 'salt', quantity: 0.5, unit: 'tsp' },
      { name: 'black pepper', quantity: 0.5, unit: 'tsp' },
      { name: 'cooking oil', quantity: 2, unit: 'tbsp' },
      { name: 'soy sauce', quantity: 0.25, unit: 'cup' },
      { name: 'honey', quantity: 3, unit: 'tbsp' },
      { name: 'brown sugar', quantity: 2, unit: 'tbsp' },
      { name: 'garlic cloves', quantity: 3, unit: '', note: 'minced' },
      { name: 'rice vinegar', quantity: 1, unit: 'tbsp' },
      { name: 'sesame oil', quantity: 1, unit: 'tsp' },
      { name: 'water', quantity: 2, unit: 'tbsp' },
      { name: 'steamed white rice', quantity: 3, unit: 'cups' },
      { name: 'green onions', quantity: 2, unit: '', note: 'sliced' },
      { name: 'sesame seeds', quantity: 1, unit: 'tsp' }
    ],
    steps: [
      { number: 1, instruction: 'Pat the chicken thighs dry and season with salt and pepper.' },
      { number: 2, instruction: 'Coat the chicken lightly in cornstarch.' },
      { number: 3, instruction: 'Heat oil in a skillet over medium-high heat.' },
      { number: 4, instruction: 'Pan-fry the chicken until crispy and golden on both sides and cooked through to 165°F. Remove and set aside.' },
      { number: 5, instruction: 'Combine soy sauce, honey, brown sugar, garlic, rice vinegar, sesame oil and water.' },
      { number: 6, instruction: 'Pour the sauce into the skillet and simmer until thick and glossy.' },
      { number: 7, instruction: 'Return the chicken to the pan and coat thoroughly in the glaze.' },
      { number: 8, instruction: 'Slice and serve over rice, garnished with green onions and sesame seeds.' }
    ],
    nutrition_total: { calories: 2240, protein_g: 104, fat_g: 78, carbs_g: 268, fiber_g: 6, sugar_g: 72, sodium_mg: 3600 }
  },
  {
    id: 'soy-garlic-ramen', title: 'Soy Garlic Chicken Ramen', creator: 'nurish.kitchen', servings: 2, shelfDays: 2,
    caption: 'Creamy ramen with soy garlic chicken, jammy eggs and green onions. Pure comfort. 🍜',
    tags: ['chicken', 'noodle', 'ramen'], likes: 6840, palette: ['#C98B4A', '#6B3F22', '#E0A43B', '#EBD9B5', '#1C140D'],
    videoUrl: 'https://res.cloudinary.com/az96zvxn/video/upload/f_mp4,vc_h264/v1792943344/reel-4.mp4.mov',
    ingredients: [
      { name: 'boneless chicken thighs', quantity: 1, unit: 'lb' },
      { name: 'maple syrup', quantity: 1, unit: 'tbsp' },
      { name: 'black pepper', quantity: 0.5, unit: 'tsp' },
      { name: 'paprika', quantity: 0.5, unit: 'tsp' },
      { name: 'soy sauce', quantity: 3, unit: 'tbsp', note: '1 tbsp for chicken, 2 tbsp for broth' },
      { name: 'oil', quantity: 1, unit: 'tbsp' },
      { name: 'shallots', quantity: 2, unit: '', note: 'finely chopped' },
      { name: 'garlic cloves', quantity: 3, unit: '', note: 'minced' },
      { name: 'ginger', quantity: 1, unit: 'tbsp', note: 'minced' },
      { name: 'chicken broth', quantity: 2, unit: 'cups' },
      { name: 'milk or unsweetened soy milk', quantity: 1, unit: 'cup' },
      { name: 'miso paste', quantity: 1, unit: 'tbsp', note: 'optional' },
      { name: 'ramen noodles', quantity: 2, unit: 'portions' },
      { name: 'soft-boiled eggs', quantity: 2, unit: '' },
      { name: 'green onions', quantity: 2, unit: '' },
      { name: 'chili oil', quantity: 1, unit: 'tbsp' }
    ],
    steps: [
      { number: 1, instruction: 'Marinate the chicken with maple syrup, black pepper, paprika and 1 tbsp soy sauce.' },
      { number: 2, instruction: 'Sear the chicken in a hot skillet until browned and cooked through. Remove and set aside.' },
      { number: 3, instruction: 'In a pot, sauté the shallots, garlic and ginger until fragrant.' },
      { number: 4, instruction: 'Add 2 tbsp soy sauce and the chicken broth.' },
      { number: 5, instruction: 'Stir in the milk and the optional miso paste.' },
      { number: 6, instruction: 'Simmer gently for 5–8 minutes.' },
      { number: 7, instruction: 'Cook the ramen noodles according to the package directions.' },
      { number: 8, instruction: 'Divide the noodles and broth between bowls.' },
      { number: 9, instruction: 'Top with sliced chicken, soft-boiled eggs, green onions and chili oil.' }
    ],
    nutrition_total: { calories: 1760, protein_g: 118, fat_g: 72, carbs_g: 148, fiber_g: 8, sugar_g: 24, sodium_mg: 4200 }
  }
];

const SEED_COLLECTIONS = [
  { id: 'fav', name: 'Favorites', ids: ['soy-garlic-ramen', 'garlic-soy-chicken'] },
  { id: 'chicken', name: 'Chicken', ids: ['coconut-chicken', 'garlic-soy-chicken', 'soy-garlic-ramen'] },
  { id: 'beef', name: 'Beef', ids: ['beef-pasta'] },
  { id: 'noodles', name: 'Noodles & Pasta', ids: ['beef-pasta', 'soy-garlic-ramen'] },
  { id: 'cozy', name: 'Cozy', ids: ['soy-garlic-ramen', 'coconut-chicken'] },
  { id: 'quick', name: 'Weeknight', ids: ['beef-pasta', 'coconut-chicken', 'garlic-soy-chicken'] }
];

const SEED_COMMENTS = {
  'beef-pasta': [['ren', 'Made this last night — the creamy tomato sauce is unreal.'], ['sofia_k', 'Added a pinch of chili flakes, so good.']],
  'coconut-chicken': [['dan', 'The coconut sauce over rice is everything.']],
  'garlic-soy-chicken': [['pia', 'That glaze is so glossy. Cornstarch trick works.']],
  'soy-garlic-ramen': [['mika', 'Jammy egg + chili oil = perfect bowl.']]
};
