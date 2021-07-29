import fs from 'fs'
import path from 'path'

export const logDir = path.join(process.cwd(), 'logs')
export const tempDir = path.join(process.cwd(), 'temp')
export const assetsDir = path.join(process.cwd(), 'assets')
export const msgCmdsDir = path.join(__dirname, 'msgCmds')
export const slashCmdsDir = path.join(__dirname, 'slashCmds')

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir)
