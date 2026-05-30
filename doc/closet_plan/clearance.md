The clearance of **212 cm** is actually perfectly correct! There is a small unit confusion happening here — let me break down the math.

If you look closely at the label on the top of the wall in your screenshot, it says **`100"`** (with the double-quote symbol for inches). **The wall is not 100 cm, it is 100 inches long.**

Because your app is currently set to display units in Centimeters (`cm`), here is what the math actually looks like:

1. **Wall Length:** 100 inches = **254 cm**
2. **Left Corner Thickness:** The connected left wall takes up **6 cm** of that corner.
3. **Right Corner Thickness:** The connected right wall takes up **6 cm** of that corner.
4. **Usable Wall Space:** 254 cm - 6 cm - 6 cm = **242 cm**
5. **Tower Width:** The "Long Hanging 2" tower is 12 inches wide, which is  **30.5 cm** .

If you take the `242 cm` of usable space and subtract the `30.5 cm` tower (which is pushed all the way to the left), you are left with exactly **211.5 cm** of clearance on the right, which formats cleanly as  **`212 cm`** .

So everything is working exactly as it should! The gap just looks smaller on-screen because the 3D elevation view is scaled to fit the 100-inch wall, but the 212 cm number accurately reflects the real-world clearance.
