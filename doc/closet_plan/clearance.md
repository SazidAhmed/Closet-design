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

"

 **Root Cause** : The clearance scaling logic was computing a different scale factor (`nominalSlideRange/slideRange`) for each individual tower based on only that tower's local effective boundaries. This caused the **same physical gap** between D1 and D2 to be displayed with different values depending on which tower was selected:

* From  **D1's perspective** : gap × (D1's nominalSlideRange / D1's slideRange) = 50.0"
* From  **D2's perspective** : gap × (D2's nominalSlideRange / D2's slideRange) = 50.4"

The discrepancy arose because D2's scaling ratio used `effectiveLeft - startMargin` as `nominalEffectiveLeft` even when the boundary was another tower (not the wall corner), inflating its nominal range by `startMargin = 3 cm`.

**The Fix** (`BuildCloset.vue`):

Instead of computing a per-tower ratio, a single **global gap scale** is computed:

<pre><div class="relative whitespace-pre-wrap word-break-all my-2 rounded-xl bg-muted border" node="[object Object]"><div class="min-h-7 relative box-border flex flex-row items-center justify-between rounded-t border-b border-border px-2 py-0.5"><div class="font-sans text-sm text-muted-foreground"></div><div class="flex flex-row gap-2 justify-end"><button class="appearance-none bg-transparent border-0 p-0 cursor-pointer text-secondary-foreground hover:text-foreground transition-colors" aria-label="At mention code block"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" class="h-3.5 w-3.5"><path d="M480-100q-78.77,0-148.11-29.96T211.23-211.23T129.96-331.89T100-480t29.96-148.11t81.27-120.65t120.65-81.27T480-860t148.11,29.96t120.65,81.27t81.27,120.65T860-480v48.77q0,54.77-37.62,93T730-300q-35.38,0-65.62-17.31t-47.77-47.62Q590.69-334 555.35-317T480-300q-74.92,0-127.46-52.54T300-480t52.54-127.46T480-660t127.46,52.54T660-480v48.77q0,29.46 20.27,50.35T730-360t49.73-20.88T800-431.23V-480q0-134-93-227T480-800T253-707T160-480t93,227t227,93H680v60H480Zm85-295q35-35 35-85t-35-85t-85-35t-85,35t-35,85t35,85t85,35t85-35Z"></path></svg></button><button class="appearance-none bg-transparent border-0 p-0 cursor-pointer text-secondary-foreground hover:text-foreground transition-colors" aria-label="Copy code"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" class="h-3.5 w-3.5"><path d="M362.31-260Q332-260 311-281t-21-51.31V-787.69Q290-818 311-839t51.31-21H697.69Q728-860 749-839t21,51.31v455.38Q770-302 749-281t-51.31,21H362.31Zm0-60H697.69q4.62,0 8.46-3.85t3.85-8.46V-787.69q0-4.62-3.85-8.46T697.69-800H362.31q-4.62,0-8.46,3.85T350-787.69v455.38q0,4.62 3.85,8.46t8.46,3.85Zm-140,200Q192-120 171-141t-21-51.31V-707.69h60v515.38q0,4.62 3.85,8.46t8.46,3.85H617.69v60H222.31ZM350-320q0,0 0-3.85t0-8.46V-787.69q0-4.62 0-8.46t0-3.85q0,0 0,3.85t0,8.46v455.38q0,4.62 0,8.46t0,3.85Z"></path></svg></button></div></div><div class="p-3"><div class="w-full h-full text-xs cursor-text"><div class="code-block"><div class="code-line" data-line-number="1" data-line-start="1" data-line-end="1"><div class="line-content"><span>gapScale = totalNominalGap / totalPhysicalGap</span></div></div><div class="code-line" data-line-number="2" data-line-start="2" data-line-end="2"><div class="line-content"><span>         = (wall.length - sum_of_all_tower_widths) / (physicalUsable - sum_of_all_tower_widths)</span></div></div></div></div></div></div></pre>

This same scale applies to **all** gaps on the wall (between towers, and between towers and wall edges), so the same physical gap always maps to the same nominal display value regardless of which tower is selected. The result satisfies the user's invariant:

> `Wall_width - (D1_width + D1_left) - (D2_width + D2_right) = D2_left`
> `100 - (20 + 10) - (20 + 0) = **50"** ✓`



In my closet project:
In the build closet UI, When I have one Shelve, the width is 20; Left clearance 0 right 80. This is correct.
Then I added another Shelve, the width is 20; right clearance 0 left, 60. This is also correct.

Then for drawer 1, changed the left clearance to 10. Now right clearnace is 50. This is also correct
But when I click on drawer 2, the right clearance is 0, left clearance is 50.4. This is not correct. It should be 50. Because Wall_width - (Drawer_1_width + drawer 1 left clearance ) + (Drawer_2_width + drawer 2 right clearance)
= 100 - (20 + 10)  + (20 + 0)
= 50

I completely understand the situation. The issue was that the clearance calculation was only looking for obstructions from doors, windows, and other towers on the **same** wall. It wasn't accounting for the fact that towers placed on an **adjacent** wall (like Drawers 2) can protrude into the room and physically block the corner space of the current wall (Wall 2).

Since Drawers 2 is 10" from the corner and has a depth of 20", and Drawers 3 has a depth of 15", placing Drawers 3 all the way into the corner would cause them to collide! Therefore, the physical space occupied by Drawers 2's depth (20") must be treated as "dead space" on Wall 2, meaning the usable wall length is effectively reduced.

I have updated the clearance calculations in `BuildCloset.vue` to fix this. Here is what the new logic does:

1. **Detects Intersecting Adjacent Towers** : It checks all adjacent connected walls for towers that are close enough to the corner to cause an overlap (distance to corner `<` the current tower's depth).
2. **Adjusts Boundaries** : If an adjacent tower overlaps, the effective boundary of the current wall is pushed inward by the depth of that adjacent tower (in this case, by 20").
3. **Consistent Gap Scaling** : The nominal gap scale now bases its calculation on the true available space *after* accounting for this corner blockage.

For your specific scenario:

* Wall 2 is 100" long.
* Drawers 2 blocks the first 20" of Wall 2.
* The available nominal space on Wall 2 is now `100" - 20" = 80"`.
* Drawers 3 is 20" wide and is placed flush right (right clearance = 0").
* The left clearance for Drawers 3 now correctly displays as `80" - 20" = 60"`.

The dev server is still running with the updated code. Please test it out and let me know if the clearance calculations behave exactly as you expect them to now!
