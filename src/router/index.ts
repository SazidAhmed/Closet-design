import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/closet/type',
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
      path: '/closet/review',
      name: 'Review',
      component: () => import('../features/closet/views/ReviewPage.vue'),
    },
  ],
})
