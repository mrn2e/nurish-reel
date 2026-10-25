/* Seed content. Shapes mirror app/models/recipe.py so API results drop straight in.
   nutrition_total is for the whole recipe; per serving = total / servings. */
const SEED_RECIPES = [
  {
    id: 'katsudon', title: 'Chicken Katsudon', creator: 'mika.cooks', servings: 2, shelfDays: 3,
    caption: 'Crisp cutlet, soft egg, sweet dashi. Ten minutes once the chicken is fried.',
    tags: ['chicken', 'rice', 'japanese'], likes: 2412, palette: ['#F2C230', '#E08A2B', '#D9A441', '#F6E7A1', '#1B2A33'],
    ingredients: [
      { name: 'chicken tenderloin', quantity: 300, unit: 'g' }, { name: 'sake', quantity: 2, unit: 'tbsp' },
      { name: 'mirin', quantity: 2, unit: 'tbsp' }, { name: 'dashi', quantity: 150, unit: 'ml' },
      { name: 'onions', quantity: 2, unit: '' }, { name: 'eggs', quantity: 3, unit: '' },
      { name: 'panko', quantity: 1, unit: 'cup' }, { name: 'soy sauce', quantity: 2, unit: 'tbsp' },
      { name: 'cooked rice', quantity: 2, unit: 'cups' }
    ],
    steps: [
      { number: 1, instruction: 'Pound the tenderloin flat, season, then dredge in flour, beaten egg and panko.' },
      { number: 2, instruction: 'Fry at 170C until deep gold, about 4 minutes. Rest, then slice.' },
      { number: 3, instruction: 'Simmer sliced onion in dashi, sake, mirin and soy for 3 minutes.' },
      { number: 4, instruction: 'Lay the cutlet in the pan, pour beaten egg over, lid on for 30 seconds.' },
      { number: 5, instruction: 'Slide everything over hot rice and serve right away.' }
    ],
    nutrition_total: { calories: 1180, protein_g: 78, fat_g: 34, carbs_g: 130, fiber_g: 6, sugar_g: 14, sodium_mg: 2400 }
  },
  {
    id: 'veggiesoup', title: 'Veggie Soup', creator: 'greenhouse.jo', servings: 4, shelfDays: 5,
    caption: 'One pot, whatever is in the crisper, better on day two.',
    tags: ['veggie', 'soup', 'vegan'], likes: 988, palette: ['#8DB580', '#3F7A5B', '#E8A33D', '#7CC06A', '#F3EEE4'],
    ingredients: [
      { name: 'carrots', quantity: 3, unit: '' }, { name: 'celery stalks', quantity: 2, unit: '' },
      { name: 'yellow onion', quantity: 1, unit: '' }, { name: 'garlic cloves', quantity: 3, unit: '' },
      { name: 'diced tomatoes', quantity: 1, unit: 'can' }, { name: 'vegetable stock', quantity: 1, unit: 'l' },
      { name: 'white beans', quantity: 1, unit: 'can' }, { name: 'kale', quantity: 2, unit: 'cups' }
    ],
    steps: [
      { number: 1, instruction: 'Sweat onion, carrot and celery in olive oil for 8 minutes.' },
      { number: 2, instruction: 'Add garlic, tomatoes and stock. Simmer 20 minutes.' },
      { number: 3, instruction: 'Stir in beans and kale, cook 5 more minutes, season well.' }
    ],
    nutrition_total: { calories: 760, protein_g: 32, fat_g: 14, carbs_g: 124, fiber_g: 30, sugar_g: 28, sodium_mg: 2100 }
  },
  {
    id: 'meatballs', title: 'Meatballs', creator: 'nonna.lu', servings: 4, shelfDays: 4,
    caption: 'Milk-soaked bread is the whole secret. Do not skip it.',
    tags: ['beef', 'pork', 'italian'], likes: 5120, palette: ['#D9452F', '#7A2A24', '#8A4B2C', '#C46B3A', '#EEE6D8'],
    ingredients: [
      { name: 'ground beef', quantity: 400, unit: 'g' }, { name: 'ground pork', quantity: 200, unit: 'g' },
      { name: 'bread', quantity: 2, unit: 'slices' }, { name: 'milk', quantity: 80, unit: 'ml' },
      { name: 'parmesan', quantity: 50, unit: 'g' }, { name: 'egg', quantity: 1, unit: '' },
      { name: 'passata', quantity: 500, unit: 'ml' }
    ],
    steps: [
      { number: 1, instruction: 'Soak torn bread in milk, then mash into the meat with egg, cheese and salt.' },
      { number: 2, instruction: 'Roll into plum-sized balls and brown on all sides.' },
      { number: 3, instruction: 'Finish in simmering passata for 15 minutes.' }
    ],
    nutrition_total: { calories: 2280, protein_g: 168, fat_g: 148, carbs_g: 74, fiber_g: 6, sugar_g: 18, sodium_mg: 3100 }
  },
  {
    id: 'bulgogi', title: 'Beef Bulgogi Bowl', creator: 'seoul.supper', servings: 2, shelfDays: 3,
    caption: 'Pear in the marinade, thin slices, screaming hot pan.',
    tags: ['beef', 'rice', 'korean'], likes: 3304, palette: ['#2B3F4F', '#14201B', '#5B2E22', '#E0B36A', '#E8E1D0'],
    ingredients: [
      { name: 'thin sliced ribeye', quantity: 350, unit: 'g' }, { name: 'soy sauce', quantity: 3, unit: 'tbsp' },
      { name: 'asian pear, grated', quantity: 0.5, unit: '' }, { name: 'garlic cloves', quantity: 3, unit: '' },
      { name: 'sesame oil', quantity: 1, unit: 'tbsp' }, { name: 'scallions', quantity: 3, unit: '' },
      { name: 'cooked rice', quantity: 2, unit: 'cups' }
    ],
    steps: [
      { number: 1, instruction: 'Marinate the beef in soy, pear, garlic and sesame oil for 30 minutes.' },
      { number: 2, instruction: 'Sear in small batches in a very hot pan.' },
      { number: 3, instruction: 'Serve over rice with scallions.' }
    ],
    nutrition_total: { calories: 1240, protein_g: 74, fat_g: 48, carbs_g: 120, fiber_g: 4, sugar_g: 16, sodium_mg: 2800 }
  },
  {
    id: 'gyoza', title: 'Pork Gyoza', creator: 'mika.cooks', servings: 4, shelfDays: 2,
    caption: 'Fry, add water, lid on, wait for the crackle to stop.',
    tags: ['pork', 'dumpling', 'japanese'], likes: 1876, palette: ['#C9D6E3', '#7C98B3', '#EBD9B5', '#C98B4A', '#22303C'],
    ingredients: [
      { name: 'ground pork', quantity: 300, unit: 'g' }, { name: 'napa cabbage', quantity: 2, unit: 'cups' },
      { name: 'garlic chives', quantity: 1, unit: 'bunch' }, { name: 'ginger', quantity: 1, unit: 'tbsp' },
      { name: 'gyoza wrappers', quantity: 30, unit: '' }, { name: 'soy sauce', quantity: 1, unit: 'tbsp' }
    ],
    steps: [
      { number: 1, instruction: 'Salt and squeeze the cabbage, then mix with pork, chives, ginger and soy.' },
      { number: 2, instruction: 'Fill and pleat the wrappers.' },
      { number: 3, instruction: 'Fry flat side down, add a splash of water, cover and steam 4 minutes.' }
    ],
    nutrition_total: { calories: 1320, protein_g: 70, fat_g: 62, carbs_g: 120, fiber_g: 8, sugar_g: 6, sodium_mg: 2600 }
  },
  {
    id: 'cucumber', title: 'Smashed Cucumber Salad', creator: 'greenhouse.jo', servings: 2, shelfDays: 2,
    caption: 'Hit it with a rolling pin so the dressing sticks.',
    tags: ['veggie', 'apps', 'vegan'], likes: 742, palette: ['#CFE3A6', '#6FA070', '#9ACD7A', '#F0F3E0', '#A3412F'],
    ingredients: [
      { name: 'persian cucumbers', quantity: 4, unit: '' }, { name: 'rice vinegar', quantity: 2, unit: 'tbsp' },
      { name: 'chili crisp', quantity: 1, unit: 'tbsp' }, { name: 'garlic clove', quantity: 1, unit: '' },
      { name: 'sesame seeds', quantity: 1, unit: 'tsp' }
    ],
    steps: [
      { number: 1, instruction: 'Smash the cucumbers and tear into chunks. Salt for 10 minutes and drain.' },
      { number: 2, instruction: 'Toss with vinegar, chili crisp, grated garlic and sesame.' }
    ],
    nutrition_total: { calories: 210, protein_g: 6, fat_g: 11, carbs_g: 24, fiber_g: 6, sugar_g: 10, sodium_mg: 900 }
  }
];

const SEED_COLLECTIONS = [
  { id: 'fav', name: 'Favorites', ids: ['katsudon', 'meatballs'] },
  { id: 'pork', name: 'Pork', ids: ['gyoza', 'meatballs'] },
  { id: 'chicken', name: 'Chicken', ids: ['katsudon'] },
  { id: 'apps', name: 'Apps', ids: ['cucumber', 'gyoza'] },
  { id: 'soup', name: 'Soup', ids: ['veggiesoup'] },
  { id: 'veggie', name: 'Veggie', ids: ['veggiesoup', 'cucumber'] }
];

const SEED_COMMENTS = {
  katsudon: [['ren', 'Made this last night, the egg timing is perfect.'], ['sofia_k', 'Can I use thighs instead?']],
  meatballs: [['dan', 'The bread and milk trick changed my life.']],
  veggiesoup: [['pia', 'Added parmesan rind. Do it.']]
};
