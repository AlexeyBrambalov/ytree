import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { resetMockBackend, server } from './server'

// jsdom's Blob can't be read by Node's fetch (no stream()/arrayBuffer()/text()), so uploaded files would
// arrive empty at the mock server. Read them through jsdom's own FileReader instead.
function readAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}
Blob.prototype.arrayBuffer ??= function (this: Blob) {
  return readAsArrayBuffer(this)
}
Blob.prototype.text ??= async function (this: Blob) {
  return new TextDecoder().decode(await readAsArrayBuffer(this))
}
Blob.prototype.stream ??= function (this: Blob) {
  return new ReadableStream<Uint8Array>({
    start: async (controller) => {
      controller.enqueue(new Uint8Array(await readAsArrayBuffer(this)))
      controller.close()
    },
  })
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetMockBackend())
afterEach(() => cleanup())
afterAll(() => server.close())
