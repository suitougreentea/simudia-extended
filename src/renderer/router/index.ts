import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'main-screen',
      component: require('@/components/MainScreen').default
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
