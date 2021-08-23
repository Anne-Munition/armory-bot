import fs from 'fs'
import path from 'path'
import rimraf from 'rimraf'

export const logDir = path.join(process.cwd(), 'logs')
export const tempDir = path.join(process.cwd(), 'temp')
export const assetsDir = path.join(process.cwd(), 'assets')
export const cmdsDir = path.join(__dirname, 'commands')

rimraf.sync(tempDir)
fs.mkdirSync(tempDir)
