export interface FoodRecord {
  name: string;
  brand?: string;
  /** kcal & macro grams per 100 g (100 ml for liquids). */
  per100g: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  /** Typical serving in grams — used as the default quantity. */
  servingG?: number;
  servingLabel?: string;
  source: 'local' | 'off';
}

const F = (
  name: string,
  kcal: number,
  p: number,
  c: number,
  f: number,
  servingG?: number,
  servingLabel?: string,
): FoodRecord => ({ name, per100g: { kcal, proteinG: p, carbsG: c, fatG: f }, servingG, servingLabel, source: 'local' });

/** Small offline database of common generic foods (per 100 g, USDA-approximate). */
export const LOCAL_FOODS: FoodRecord[] = [
  // Fruits
  F('Apple', 52, 0.3, 14, 0.2, 182, '1 medium'),
  F('Banana', 89, 1.1, 23, 0.3, 118, '1 medium'),
  F('Orange', 47, 0.9, 12, 0.1, 131, '1 medium'),
  F('Strawberries', 32, 0.7, 7.7, 0.3, 150, '1 cup'),
  F('Blueberries', 57, 0.7, 14, 0.3, 148, '1 cup'),
  F('Grapes', 69, 0.7, 18, 0.2, 92, '1 cup'),
  F('Watermelon', 30, 0.6, 7.6, 0.2, 280, '2 cups'),
  F('Avocado', 160, 2, 8.5, 15, 100, '½ fruit'),
  F('Mango', 60, 0.8, 15, 0.4, 165, '1 cup'),
  // Vegetables
  F('Broccoli', 34, 2.8, 6.6, 0.4, 91, '1 cup'),
  F('Carrot', 41, 0.9, 9.6, 0.2, 61, '1 medium'),
  F('Spinach', 23, 2.9, 3.6, 0.4, 30, '1 cup raw'),
  F('Tomato', 18, 0.9, 3.9, 0.2, 123, '1 medium'),
  F('Cucumber', 15, 0.7, 3.6, 0.1, 100, '1 cup'),
  F('Bell pepper', 26, 1, 6, 0.3, 119, '1 medium'),
  F('Sweet potato (baked)', 90, 2, 21, 0.2, 130, '1 medium'),
  F('Potato (boiled)', 87, 1.9, 20, 0.1, 150, '1 medium'),
  F('Corn', 86, 3.3, 19, 1.4, 90, '½ cup'),
  F('Lettuce', 15, 1.4, 2.9, 0.2, 47, '1 cup'),
  F('Onion', 40, 1.1, 9.3, 0.1, 110, '1 medium'),
  // Grains & bread
  F('White rice (cooked)', 130, 2.7, 28, 0.3, 158, '1 cup'),
  F('Brown rice (cooked)', 112, 2.6, 24, 0.9, 195, '1 cup'),
  F('Pasta (cooked)', 158, 5.8, 31, 0.9, 140, '1 cup'),
  F('Quinoa (cooked)', 120, 4.4, 21, 1.9, 185, '1 cup'),
  F('Oats (dry)', 389, 16.9, 66, 6.9, 40, '½ cup'),
  F('Oatmeal (cooked)', 71, 2.5, 12, 1.5, 234, '1 cup'),
  F('White bread', 265, 9, 49, 3.2, 28, '1 slice'),
  F('Whole wheat bread', 247, 13, 41, 3.4, 28, '1 slice'),
  F('Bagel', 250, 10, 49, 1.5, 105, '1 bagel'),
  F('Flour tortilla', 310, 8.7, 50, 8, 45, '1 tortilla'),
  F('Granola', 471, 10, 64, 20, 45, '½ cup'),
  // Protein
  F('Chicken breast (cooked)', 165, 31, 0, 3.6, 120, '1 breast'),
  F('Chicken thigh (cooked)', 209, 26, 0, 10.9, 100, '1 thigh'),
  F('Ground beef 90/10 (cooked)', 217, 26, 0, 11.8, 113, '4 oz'),
  F('Sirloin steak', 206, 26, 0, 10.6, 170, '6 oz'),
  F('Pork chop', 231, 25.7, 0, 13.5, 130, '1 chop'),
  F('Bacon', 541, 37, 1.4, 42, 24, '2 slices'),
  F('Salmon (cooked)', 208, 20, 0, 13, 125, '1 fillet'),
  F('Tuna (canned in water)', 116, 25.5, 0, 0.8, 85, '1 can drained'),
  F('Shrimp', 99, 24, 0.2, 0.3, 85, '3 oz'),
  F('Cod', 105, 23, 0, 0.9, 140, '1 fillet'),
  F('Egg', 155, 13, 1.1, 11, 50, '1 large'),
  F('Egg white', 52, 11, 0.7, 0.2, 33, '1 large'),
  F('Tofu (firm)', 76, 8, 1.9, 4.8, 85, '3 oz'),
  F('Tempeh', 192, 20, 7.6, 11, 85, '3 oz'),
  F('Black beans (cooked)', 132, 8.9, 24, 0.5, 172, '1 cup'),
  F('Chickpeas (cooked)', 164, 8.9, 27, 2.6, 164, '1 cup'),
  F('Lentils (cooked)', 116, 9, 20, 0.4, 198, '1 cup'),
  F('Edamame', 121, 12, 8.9, 5.2, 155, '1 cup'),
  // Dairy
  F('Whole milk', 61, 3.2, 4.8, 3.3, 244, '1 cup'),
  F('Skim milk', 34, 3.4, 5, 0.1, 245, '1 cup'),
  F('Greek yogurt (nonfat)', 59, 10, 3.6, 0.4, 170, '1 container'),
  F('Yogurt (whole milk)', 61, 3.5, 4.7, 3.3, 170, '1 container'),
  F('Cheddar cheese', 403, 25, 1.3, 33, 28, '1 oz'),
  F('Mozzarella', 280, 28, 3.1, 17, 28, '1 oz'),
  F('Cottage cheese', 98, 11, 3.4, 4.3, 113, '½ cup'),
  F('Butter', 717, 0.9, 0.1, 81, 14, '1 tbsp'),
  F('Cream cheese', 342, 6, 4.1, 34, 28, '2 tbsp'),
  // Nuts & snacks
  F('Almonds', 579, 21, 22, 50, 28, '~23 nuts'),
  F('Peanuts', 567, 26, 16, 49, 28, '1 oz'),
  F('Peanut butter', 588, 25, 20, 50, 32, '2 tbsp'),
  F('Walnuts', 654, 15, 14, 65, 28, '1 oz'),
  F('Cashews', 553, 18, 30, 44, 28, '1 oz'),
  F('Trail mix', 462, 14, 45, 29, 40, '¼ cup'),
  F('Dark chocolate (70%)', 598, 7.8, 46, 43, 28, '1 oz'),
  F('Milk chocolate', 535, 7.7, 59, 30, 44, '1 bar'),
  F('Potato chips', 536, 7, 53, 34, 28, '1 oz'),
  F('Popcorn (air-popped)', 387, 13, 78, 4.5, 28, '3½ cups'),
  F('Protein bar', 350, 33, 40, 9, 60, '1 bar'),
  F('Granola bar', 450, 8, 65, 18, 35, '1 bar'),
  F('Hummus', 166, 7.9, 14, 9.6, 30, '2 tbsp'),
  // Drinks
  F('Orange juice', 45, 0.7, 10, 0.2, 248, '1 cup'),
  F('Apple juice', 46, 0.1, 11, 0.1, 248, '1 cup'),
  F('Cola', 42, 0, 10.6, 0, 355, '1 can'),
  F('Beer', 43, 0.5, 3.6, 0, 355, '1 can'),
  F('Red wine', 85, 0.1, 2.6, 0, 148, '1 glass'),
  F('Coffee (black)', 2, 0.3, 0, 0, 240, '1 cup'),
  F('Latte (whole milk)', 48, 2.5, 4, 2.5, 355, '12 oz'),
  F('Whey protein powder', 375, 75, 12.5, 6.3, 30, '1 scoop'),
  F('Fruit smoothie', 60, 1, 14, 0.3, 350, '12 oz'),
  // Meals & prepared
  F('Cheese pizza', 266, 11, 33, 10, 107, '1 slice'),
  F('Hamburger', 240, 12, 29, 9, 105, '1 burger'),
  F('Cheeseburger', 263, 13, 28, 12, 115, '1 burger'),
  F('French fries', 312, 3.4, 41, 15, 117, 'medium'),
  F('Chicken burrito', 180, 9, 22, 6, 220, '1 burrito'),
  F('Caesar salad with chicken', 127, 10, 6, 7, 250, '1 bowl'),
  F('California roll', 129, 5, 24, 1.4, 190, '8 pieces'),
  F('Instant ramen', 436, 9.5, 62, 17, 85, '1 pack'),
  F('Mac & cheese', 164, 6.4, 20, 6.6, 200, '1 cup'),
  F('Pancakes', 227, 6.4, 28, 9.7, 77, '2 pancakes'),
  F('Vanilla ice cream', 207, 3.5, 24, 11, 66, '½ cup'),
  F('Glazed donut', 452, 4.9, 51, 25, 60, '1 donut'),
  F('Chocolate chip cookie', 488, 5.4, 64, 24, 30, '1 large'),
  // Condiments & fats
  F('Olive oil', 884, 0, 0, 100, 14, '1 tbsp'),
  F('Honey', 304, 0.3, 82, 0, 21, '1 tbsp'),
  F('Sugar', 387, 0, 100, 0, 4, '1 tsp'),
  F('Ketchup', 112, 1, 26, 0.1, 17, '1 tbsp'),
  F('Mayonnaise', 680, 1, 0.6, 75, 14, '1 tbsp'),
  F('Ranch dressing', 430, 1.3, 7, 45, 30, '2 tbsp'),
];

/** Case-insensitive multi-token substring search over the local database. */
export function searchLocalFoods(query: string, limit = 6): FoodRecord[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const matches = LOCAL_FOODS.filter((food) => {
    const haystack = `${food.name} ${food.brand ?? ''}`.toLowerCase();
    return tokens.every((t) => haystack.includes(t));
  });
  matches.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(tokens[0]) ? 0 : 1;
    const bStarts = b.name.toLowerCase().startsWith(tokens[0]) ? 0 : 1;
    return aStarts - bStarts || a.name.length - b.name.length;
  });
  return matches.slice(0, limit);
}
