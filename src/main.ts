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
            hideDetails: true,
            density: "compact",
        },
    },
    theme: {
        defaultTheme: "customTheme",
        themes: {
            customTheme: {
                dark: false,
                colors: {
                    background: "#ffffff",
                    surface: "#ffffff",
                    primary: "#4c8030",
                    secondary: "#8bc34a",
                    accent: "#cddc39",
                    error: "#ff5722",
                    warning: "#ffc107",
                    info: "#03a9f4",
                    success: "#009688",
                },
            }
        },
    },
}))

app.mount('#app')
