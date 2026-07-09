import api from '../api/axios'

export async function downloadExport(path, params, filename) {
  const res = await api.get(path, {
    params,
    responseType: 'blob',
  })
  const blob = new Blob(
    [res.data],
    { type: res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  )
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}
