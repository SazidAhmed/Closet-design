import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/closet/floorplan',
    },
    {
      path: '/closet/type',
      name: 'SelectClosetType',
      component: () => import('../features/closet/views/SelectClosetType.vue'),
    },
    {
      path: '/closet/floorplan',
      name: 'FloorPlan',
      component: () => import('../features/closet/views/FloorPlan.vue'),
    },
    {
      path: '/closet/design',
      name: 'DesignCloset',
      component: () => import('../features/closet/views/DesignCloset.vue'),
    },
    {
      path: '/closet/build',
      name: 'BuildCloset',
      component: () => import('../features/closet/views/BuildCloset.vue'),
    },
    {
      path: '/closet/review',
      name: 'Review',
      component: () => import('../features/closet/views/ReviewPage.vue'),
    },
    {
      path: '/unauthorized',
      name: 'Unauthorized',
      component: () => import('../views/UnauthorizedPage.vue'),
      meta: { public: true },
    },
  ],
})

// Navigation guard: require a valid auth token to access the app.
// Token can come from:
//   1. URL query param (?token=...) — set by the Dia-Website "Design Closet" button
//   2. localStorage (access_token) — persisted from a previous session / tab refresh
router.beforeEach((to) => {
  // Allow the unauthorized page itself (avoid redirect loop)
  if (to.meta.public) return true

  const urlToken = to.query.token as string | undefined
  const storedToken = localStorage.getItem('access_token')

  if (urlToken || storedToken) {
    return true
  }

  // No token found — block access
  return { name: 'Unauthorized' }
})
