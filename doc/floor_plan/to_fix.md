I decreased the length of wall 4 and I can see the output as expected.
But when I crease the length of wall 4 the output is not correct. Should I share the incorrect output screenshot?

I can see it: after increasing wall 4, the frame still biases in a way that makes the room feel shifted downward in closed mode. I’m applying a stricter closed-room lock refresh (on next tick after geometry update) so the lock uses the final updated bounds, then I’ll re-run integration tests.


The viewport issue is the closed-room lock being refreshed too early, before Vue has fully applied the resized wall geometry. That leaves the draw frame stale and makes the room appear to drift after increasing wall 4.

I’m blocked from applying the code change in this session because the available agent/tool path hit a rate limit before I could finish the edit. The fix I would apply is small:

Make the closed-room length handler refresh the locked draw frame on the next Vue tick after resizeWallLength(...).
Keep the current open-room lock behavior unchanged.
Re-run the closed-room integration test to confirm the frame stays on the updated geometry.
