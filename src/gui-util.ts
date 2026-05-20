import { watch, type Ref } from "vue"

type GuiStore = {
  workspaceSize: {
    width: number;
    height: number;
  }
  scrollbarSize: {
    width: number;
    height: number;
  }
}

export const observeMainWorkspaceSize = (container: Ref<HTMLElement | undefined>, gui: GuiStore) => {
  const containerResizeObserver = new ResizeObserver(() => {
    if (currentObservedContainer == null) return
    gui.workspaceSize = {
      width: currentObservedContainer.clientWidth,
      height: currentObservedContainer.clientHeight,
    }
    gui.scrollbarSize = {
      width: currentObservedContainer.offsetWidth - currentObservedContainer.clientWidth,
      height: currentObservedContainer.offsetHeight - currentObservedContainer.clientHeight,
    }
  })

  let currentObservedContainer: HTMLElement | undefined = undefined
  watch(container, c => {
    if (currentObservedContainer != null) containerResizeObserver.unobserve(currentObservedContainer)
    if (c != null) containerResizeObserver.observe(c)
    currentObservedContainer = c
  })
  return { cancel: () => containerResizeObserver.disconnect() }
}