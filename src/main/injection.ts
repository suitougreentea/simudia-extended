import { type InjectionKey, type Ref } from "vue"
import StationContextMenu from "../context-menus/StationContextMenu.vue"
import LineContextMenu from "../context-menus/LineContextMenu.vue"
import LineSegmentContextMenu from "../context-menus/LineSegmentContextMenu.vue"

export const stationContextMenuInjection: InjectionKey<Ref<InstanceType<typeof StationContextMenu>>> = Symbol()
export const lineContextMenuInjection: InjectionKey<Ref<InstanceType<typeof LineContextMenu>>> = Symbol()
export const lineSegmentContextMenuInjection: InjectionKey<Ref<InstanceType<typeof LineSegmentContextMenu>>> = Symbol()