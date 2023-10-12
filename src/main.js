import { createApp } from 'vue'
import { createPinia } from 'pinia'
import MainScreen from './main/MainScreen.vue'

const app = createApp(MainScreen)

app.use(createPinia())

app.mount('#app')
