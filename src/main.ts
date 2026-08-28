import { createApp, vaporInteropPlugin } from "vue";
import "./style.css";
import App from "./App.vue";

createApp(App).use(vaporInteropPlugin).mount("#app");
