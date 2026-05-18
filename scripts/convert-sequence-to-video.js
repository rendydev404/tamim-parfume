/**
 * Convert image sequence to optimized MP4 video for scroll animation.
 * Produces a high-quality H.264 video with faststart for instant streaming.
 */
const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static')
const path = require('path')
const fs = require('fs')

ffmpeg.setFfmpegPath(ffmpegPath)

const INPUT_DIR = path.join(__dirname, '..', 'public', 'sequnece')
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'sequence-hero.mp4')

// Check that input directory exists
if (!fs.existsSync(INPUT_DIR)) {
  console.error('Input directory not found:', INPUT_DIR)
  process.exit(1)
}

const frameCount = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.jpg')).length
console.log(`Found ${frameCount} frames in ${INPUT_DIR}`)
console.log(`Output: ${OUTPUT_FILE}`)
console.log('Converting...')

ffmpeg()
  .input(path.join(INPUT_DIR, 'ezgif-frame-%03d.jpg'))
  .inputOptions([
    '-framerate 30',
    '-start_number 1'
  ])
  .outputOptions([
    '-c:v libx264',        // H.264 codec — universally supported
    '-preset slow',        // Slower = better compression
    '-crf 18',             // High quality (lower = better quality, 18 is visually lossless)
    '-pix_fmt yuv420p',    // Maximum browser compatibility
    '-movflags +faststart', // Enable progressive/streaming download
    '-an',                 // No audio track
    '-vf scale=1920:1080', // Keep original HD resolution
    '-profile:v high',     // H.264 high profile
    '-level 4.1',          // Compatibility level
  ])
  .output(OUTPUT_FILE)
  .on('start', (cmd) => {
    console.log('FFmpeg command:', cmd)
  })
  .on('progress', (progress) => {
    if (progress.percent) {
      process.stdout.write(`\rProgress: ${Math.round(progress.percent)}%`)
    }
  })
  .on('end', () => {
    const stats = fs.statSync(OUTPUT_FILE)
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
    console.log(`\n✅ Done! Output: ${OUTPUT_FILE}`)
    console.log(`📦 File size: ${sizeMB} MB`)
    console.log(`📊 Original ${frameCount} JPGs → 1 MP4 video`)
  })
  .on('error', (err) => {
    console.error('❌ Error:', err.message)
    process.exit(1)
  })
  .run()
