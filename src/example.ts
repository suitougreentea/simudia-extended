export type Example = {
  name: string,
  url: string,
}

export const fetchExampleList = async (): Promise<Example[]> => {
  const fetched = await fetch("https://api.github.com/repos/suitougreentea/simudia-extended/contents/examples/")
  if (!fetched.ok) throw new Error(fetched.statusText)
  const list = await fetched.json()
  return (list as { name: string, path: string }[]).map(e => ({
    name: e.name,
    url: "https://cdn.jsdelivr.net/gh/suitougreentea/simudia-extended@latest/" + e.path,
  }))
}