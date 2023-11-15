export interface OpenFileHandle {
  filename: string
  content: string | null
  saveAvailable: boolean
  save(content: string): Promise<void>
}

export interface FileHandler {
  name: string
  fileDropAvailable: boolean
  isAvailable(): boolean
  open(options: { legacy: boolean }): Promise<OpenFileHandle>
  onFileDrop(ev: DragEvent): Promise<OpenFileHandle>
  saveAs(content: string, preferredFilename: string): Promise<OpenFileHandle>
}

export class FileApiFileHandler implements FileHandler {
  name = "File API"
  fileDropAvailable = true

  isAvailable(): boolean {
    if (File?.prototype?.text == null) return false
    if (DataTransferItem?.prototype?.getAsFile == null) return false
    return true
  }

  open(options: { legacy: boolean }): Promise<OpenFileHandle> {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input")
      input.type = "file"
      input.onchange = async (ev) => {
        if (input.files == null || input.files.length == 0) {
          reject(new Error("No files provided"))
          return
        }
        const file = input.files[0]
        const content = await file.text()
        resolve(new NoSaveOpenFileHandle(file.name, content))
      }
      input.click()
    })
  }

  async onFileDrop(ev: DragEvent): Promise<OpenFileHandle> {
    const item = ev.dataTransfer?.items?.[0]
    const file = ev.dataTransfer?.files?.[0]
    let fileToLoad: File | null = null
    if (item != null) {
      if (item.kind === "file") {
        fileToLoad = item.getAsFile()
      }
    } else if (file != null) {
      fileToLoad = file
    }

    if (fileToLoad == null) throw new Error("No files provided")

    const content = await fileToLoad.text()
    return new NoSaveOpenFileHandle(fileToLoad.name, content)
  }

  saveAs(content: string, preferredFilename: string): Promise<OpenFileHandle> {
    const blob = new Blob([content], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement("a")
    a.href = url
    a.download = preferredFilename
    a.click()

    URL.revokeObjectURL(url)

    return Promise.resolve(new NoSaveOpenFileHandle(preferredFilename, content))
  }
}

class NoSaveOpenFileHandle implements OpenFileHandle {
  filename: string
  content: string | null
  saveAvailable = false

  constructor(filename: string, content: string) {
    this.filename = filename
    this.content = content
  }
  save(content: string): Promise<void> {
    return Promise.reject()
  }
}

export class FileSystemApiFileHandler implements FileHandler {
  name = "FileSystem API"
  fileDropAvailable = true

  isAvailable(): boolean {
    if (window.showOpenFilePicker == null) return false
    if (window.showSaveFilePicker == null) return false
    if (DataTransferItem?.prototype?.getAsFileSystemHandle == null) return false
    return true
  }

  async open(options: { legacy: boolean }): Promise<OpenFileHandle> {
    const accept = options.legacy ? { "text/plain": ".simudia" } : { "application/json": ".simudiax" }
    const fileHandles = await window.showOpenFilePicker({ types: [{ accept }] })
    if (fileHandles.length == 0) throw new Error("No files provided")
    const fileHandle: FileSystemFileHandle = fileHandles[0]
    const handle = new FileSystemApiOpenFileHandle(fileHandle)
    await handle.open()
    return handle
  }

  async onFileDrop(ev: DragEvent): Promise<OpenFileHandle> {
    const item = ev.dataTransfer?.items?.[0]
    if (item == null) throw new Error("No files provided")
    if (item.kind != "file") throw new Error("Not a file")
    const fileHandle: FileSystemFileHandle = await item.getAsFileSystemHandle()
    const handle = new FileSystemApiOpenFileHandle(fileHandle)
    await handle.open()
    return handle
  }

  async saveAs(content: string, preferredFilename: string): Promise<OpenFileHandle> {
    const fileHandle: FileSystemFileHandle = await window.showSaveFilePicker({ suggestedName: preferredFilename, types: [{ accept: { "application/json": ".simudiax" } }] })
    if (fileHandle == null) throw new Error("No files provided")
    const handle = new FileSystemApiOpenFileHandle(fileHandle)
    await handle.newFile()
    await handle.save(content)
    return handle
  }
}

class FileSystemApiOpenFileHandle implements OpenFileHandle {
  handle: FileSystemFileHandle
  filename: string
  content: string | null
  saveAvailable = true

  constructor(handle: FileSystemFileHandle) {
    this.handle = handle
  }
  async open() {
    this.filename = this.handle.name
    const file = await this.handle.getFile()
    this.content = await file.text()
  }
  async newFile() {
    this.filename = this.handle.name
    this.content = null
  }

  async save(content: string): Promise<void> {
    const stream = await this.handle.createWritable()
    await stream.write(content)
    await stream.close()
    this.content = content
  }
}

export const allApis: FileHandler[] = [new FileSystemApiFileHandler(), new FileApiFileHandler()]
export const allAvailableApis = allApis.filter(e => e.isAvailable())