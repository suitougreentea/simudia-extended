import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import MainScreen from './main/MainScreen.vue'

const app = createApp(MainScreen)

app.use(createPinia())
app.use(createVuetify({
    components,
    directives,
    defaults: {
        VBtn: {
            density: "comfortable",
        },
        VInput: {
            density: "compact",
        },
        VCheckboxBtn: {
            density: "compact",
        },
        VTextField: {
            hideDetails: "auto",
            density: "compact",
        },
    }
}))

app.mount('#app')
