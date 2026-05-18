/**
 * Create additional optimized versions of the sequence video.
 */
const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static')
const path = require('path')
const fs = require('fs')

ffmpeg.setFfmpegPath(ffmpegPath)

const INPUT_DIR = path.join(__dirname, '..', 'public', 'sequnece')

// Create a more compressed version (CRF 23 = good quality, much smaller)
const OUTPUT_SMALL = path.join(__dirname, '..', 'public', 'sequence-hero-small.mp4')

console.log('Creating optimized smaller version (CRF 23)...')

ffmpeg()
  .input(path.join(INPUT_DIR, 'ezgif-frame-%03d.jpg'))
  .inputOptions(['-framerate 30', '-start_number 1'])
  .outputOptions([
    '-c:v libx264',
    '-preset slow',
    '-crf 23',              // More compressed but still great quality
    '-pix_fmt yuv420p',
    '-movflags +faststart',
    '-an',
    '-vf scale=1280:720',   // 720p for faster loading, still looks great fullscreen
    '-profile:v high',
    '-level 4.1',
  ])
  .output(OUTPUT_SMALL)
  .on('progress', (p) => { if (p.percent) process.stdout.write(`\r720p: ${Math.round(p.percent)}%`) })
  .on('end', () => {
    const s = fs.statSync(OUTPUT_SMALL)
    console.log(`\n✅ 720p version: ${(s.size / (1024 * 1024)).toFixed(2)} MB`)
  })
  .on('error', (e) => { console.error('Error:', e.message) })
  .run()
