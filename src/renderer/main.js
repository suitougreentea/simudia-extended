import Vue from "vue"

import MainScreen from "./main/MainScreen"
import store from "./store"

if (!process.env.IS_WEB) Vue.use(require("vue-electron"))
Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  components: { MainScreen },
  store,
  template: "<main-screen/>"
}).$mount("#app")
