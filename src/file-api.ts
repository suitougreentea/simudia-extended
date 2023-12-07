type FileType = "legacy" | "standard"

export interface NewFileHandle {
  hasOpenedFile: false
  getFilename(): string
}
export interface OpenFileHandle {
  hasOpenedFile: true
  getFilename(): string
  open(): Promise<string>
  save(content: string): Promise<void>
}

export interface FileHandler {
  name: string
  fileDropAvailable: boolean
  isAvailable(): boolean
  // returns null when cancelled
  open(options: { type: FileType | null }): Promise<OpenFileHandle | null>
  // returns null when cancelled
  create(options: { preferredFilename: string }): Promise<OpenFileHandle | null>
  onFileDrop(item: DataTransferItem): Promise<OpenFileHandle>
}

export const createNewFileHandle = (name?: string): NewFileHandle => ({
  hasOpenedFile: false,
  getFilename: () => name ?? "New File.simudiax",
})

export const createUrlFileHandle = (url: string): OpenFileHandle => new UrlOpenFileHandle(url)
class UrlOpenFileHandle implements OpenFileHandle {
  url: string
  resolvedFilename: string | null = null
  hasOpenedFile: true = true

  constructor(url: string) {
    this.url = url
  }
  getFilename(): string {
    if (this.resolvedFilename != null) return this.resolvedFilename
    const url = new URL(this.url)
    const names = url.pathname.split("/").filter(e => e != "")
    if (names.length == 0) return "Imported File"
    return names[names.length - 1]
  }
  async open(): Promise<string> {
    const response = await fetch(this.url)
    if (!response.ok) throw new Error(response.statusText)
    this.resolvedFilename = null // TODO: parse Content-Disposition?
    return await response.text()
  }
  save(content: string): Promise<void> {
    throw new Error("Not supported")
  }
}

export class FileApiFileHandler implements FileHandler {
  name = "File API"
  fileDropAvailable = true

  isAvailable(): boolean {
    if (File?.prototype?.text == null) return false
    if (DataTransferItem?.prototype?.getAsFile == null) return false
    return true
  }

  open(options: { type: FileType | null }): Promise<OpenFileHandle | null> {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input")
      input.type = "file"
      input.onchange = async (ev) => {
        if (input.files == null || input.files.length == 0) {
          resolve(null)
          return
        }
        const file = input.files[0]
        resolve(new FileApiOpenFileHandle(file))
      }
      input.click()
    })
  }

  create(options: { preferredFilename: string }): Promise<OpenFileHandle | null> {
    return Promise.resolve(new FileApiOpenFileHandle(options.preferredFilename))
  }

  async onFileDrop(item: DataTransferItem): Promise<OpenFileHandle> {
    const fileToLoad = item.getAsFile()
    return new FileApiOpenFileHandle(fileToLoad)
  }
}

class FileApiOpenFileHandle implements OpenFileHandle {
  file: File
  preferredFilename: string
  hasOpenedFile: true = true

  constructor(...args: [file: File] | [preferredFilename: string]) {
    if (args[0] instanceof File) {
      this.file = args[0]
    } else {
      this.preferredFilename = args[0]
    }
  }
  getFilename(): string {
    return this.file?.name ?? this.preferredFilename
  }
  async open(): Promise<string> {
    return await this.file.text()
  }
  async save(content: string): Promise<void> {
    const blob = new Blob([content], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement("a")
    a.href = url
    a.download = this.getFilename()
    a.click()

    URL.revokeObjectURL(url)
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

  async open(options: { type: FileType | null }): Promise<OpenFileHandle | null> {
    try {
      const accept: { [key: `${string}/${string}`]: `.${string}` } = {}
      if (options.type == null || options.type == "standard") accept["application/json"] = ".simudiax"
      if (options.type == null || options.type == "legacy") accept["text/plain"] = ".simudia"
      const fileHandles = await window.showOpenFilePicker({ types: [{ accept }] })
      const fileHandle: FileSystemFileHandle = fileHandles[0]
      const handle = new FileSystemApiOpenFileHandle(fileHandle)
      return handle
    } catch (e) {
      if (e instanceof DOMException && e.name == "AbortError") {
        return null
      }
      throw e
    }
  }

  async create(options: { preferredFilename: string }): Promise<OpenFileHandle | null> {
    try {
      const fileHandle: FileSystemFileHandle = await window.showSaveFilePicker({ suggestedName: options.preferredFilename, types: [{ accept: { "application/json": ".simudiax" } }] })
      if (fileHandle == null) return null
      const handle = new FileSystemApiOpenFileHandle(fileHandle)
      return handle
    } catch (e) {
      if (e instanceof DOMException && e.name == "AbortError") {
        return null
      }
      throw e
    }
  }

  async onFileDrop(item: DataTransferItem): Promise<OpenFileHandle> {
    const fileHandle: FileSystemFileHandle = await (item as any).getAsFileSystemHandle() // TODO: type definition
    const handle = new FileSystemApiOpenFileHandle(fileHandle)
    return handle
  }
}

class FileSystemApiOpenFileHandle implements OpenFileHandle {
  handle: FileSystemFileHandle
  hasOpenedFile: true = true

  constructor(handle: FileSystemFileHandle) {
    this.handle = handle
  }
  getFilename(): string {
      return this.handle.name
  }
  async open(): Promise<string> {
    const file = await this.handle.getFile()
    return await file.text()
  }

  async save(content: string): Promise<void> {
    const stream = await this.handle.createWritable()
    await stream.write(content)
    await stream.close()
  }
}

export const allApis: FileHandler[] = [new FileSystemApiFileHandler(), new FileApiFileHandler()]
export const allAvailableApis = allApis.filter(e => e.isAvailable())