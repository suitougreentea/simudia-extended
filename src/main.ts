import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
// import 'vuetify/styles'
import MainScreen from './main/MainScreen.vue'

const app = createApp(MainScreen)

app.use(createPinia())
app.use(createVuetify({ components, directives }))

app.mount('#app')
