import prettier from "prettier/standalone"
import html from "prettier/plugins/html"

const stylesheet =
`.station-name {
  font-size: 14px;
}`

export const getSvgString = async (svg: SVGElement): Promise<string> => {
  const cloned = svg.cloneNode(true) as SVGElement

  cloned.id = ""
  cloned.style.position = ""
  cloned.style.top = ""
  cloned.style.left = ""
  cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  cloned.setAttribute("version", "1.1")

  const traverseNode = (node: Element, action: (node: Element) => void) => {
    [...node.children].forEach(child => traverseNode(child, action))
    action(node)
  }
  traverseNode(cloned, node => {
    if (node instanceof SVGElement) {
      Object.keys(node.dataset).forEach(key => delete node.dataset[key])
    }
  })
  
  const style = cloned.ownerDocument.createElement("style")
  style.innerHTML = stylesheet
  cloned.insertBefore(style, cloned.firstChild)

  return await prettier.format(cloned.outerHTML, { parser: "html", plugins: [html] })
}