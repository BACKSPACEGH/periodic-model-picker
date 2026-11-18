import AppKit
import AVFoundation
import CoreGraphics
import CoreVideo
import Foundation

// Usage:
//   encode_video audio <out.wav> <durationSec>
//   encode_video mux <framesDir> <frameCount> <fps> <audioM4aPath> <outMp4Path>

@inline(__always)
func midiToHz(_ note: Double) -> Double {
    return 440.0 * pow(2.0, (note - 69.0) / 12.0)
}

func generateStereoWav(path: String, duration: Double) throws {
    let sr = 48000
    let totalSamples = Int(duration * Double(sr))
    let bpm = 124.0
    let beatSec = 60.0 / bpm
    let stepSec = beatSec / 4.0 // 16th note
    let barSec = beatSec * 4.0

    // 4-bar chord progression (Nu-Disco / French-Touch warm progression):
    // Bar 0: BbMaj9  (Bass Bb1=34 | Rhodes: D4=62, F4=65, A4=69, C5=72)
    // Bar 1: C13sus4 (Bass C2=36  | Rhodes: Bb3=58, D4=62, F4=65, A4=69)
    // Bar 2: Am7     (Bass A1=33  | Rhodes: C4=60, E4=64, G4=67, B4=71)
    // Bar 3: Dm9     (Bass D2=38  | Rhodes: F4=65, A4=69, C5=72, E5=76)
    let bassRoots: [Double] = [34, 36, 33, 38]
    let chords: [[Double]] = [
        [62, 65, 69, 72],
        [58, 62, 65, 69],
        [60, 64, 67, 71],
        [65, 69, 72, 76],
    ]
    let leadNotes: [[Double]] = [
        [74, 77, 81, 77, 74, 72, 69, 72],
        [74, 77, 81, 84, 81, 77, 74, 72],
        [72, 76, 79, 76, 72, 71, 67, 71],
        [77, 81, 84, 88, 84, 81, 77, 76],
    ]

    // Funky 16th-step bass pattern: (active, octaveUp, gateLenSteps)
    let bassSteps: [(Bool, Double, Double)] = [
        (true, 0, 0.85), (false, 0, 0), (false, 0, 0), (true, 12, 0.65),
        (false, 0, 0),   (false, 0, 0), (true, 0, 0.75), (true, 12, 0.55),
        (false, 0, 0),   (true, 0, 0.75), (false, 0, 0), (true, 12, 0.65),
        (true, 0, 0.80), (false, 0, 0), (true, 7, 0.60), (true, 12, 0.60),
    ]
    // Syncopated Nu-Disco Rhodes chord stabs on 16th steps
    let chordHitSteps: Set<Int> = [0, 3, 6, 10, 12, 14]

    // Exact UI click & whoosh timestamps matching promo-canvas.html choreography
    let uiClicks: [Double] = [
        4.74,                         // Intro click on Hydrogen pill
        14.50, 16.45, 18.39,          // Scene 02: H -> C -> Ar
        21.29, 22.45, 23.61, 24.77,   // Scene 03: Low -> Med -> High -> XHigh
        27.10, 28.80, 30.50,          // Scene 04: Fe -> Au -> Ag
        33.39, 34.19,                 // Scene 05: Keypress A, R
        38.24, 39.44, 40.84,          // Scene 06: Other models chips
        53.86                         // Scene 09: Terminal success chime
    ]
    let modalChimes: [Double] = [4.80, 5.81, 56.13]

    var pcm = [Int16](repeating: 0, count: totalSamples * 2)

    // Simple deterministic PRNG for clean percussion noise
    var rng: UInt64 = 0x9E3779B97F4A7C15
    @inline(__always)
    func whiteNoise() -> Double {
        rng = rng &* 6364136223846793005 &+ 1442695040888963407
        let v = Double((rng >> 33) & 0x7FFFFFFF) / Double(0x3FFFFFFF)
        return v - 1.0
    }

    var lpBassL = 0.0
    var lpBassR = 0.0
    var hpHatState = 0.0
    var bpClapState1 = 0.0
    var bpClapState2 = 0.0

    for i in 0..<totalSamples {
        let t = Double(i) / Double(sr)
        let barIdx = Int(t / barSec)
        let chordIdx = barIdx % 4
        let inBar = t - Double(barIdx) * barSec
        let beatInBar = Int(inBar / beatSec)
        let tBeat = inBar - Double(beatInBar) * beatSec

        // Arrange intensity: gentle intro (bars 0..1), full groove (bars 2..28), warm outro (bars 29..30)
        let fullDrums = (barIdx >= 1 && barIdx < 29)
        let hasSparkle = (barIdx >= 4 && barIdx < 25)

        var mixL = 0.0
        var mixR = 0.0

        // Sidechain pump envelope from 4-on-the-floor kick
        let sidechain = fullDrums ? (0.34 + 0.66 * (1.0 - exp(-tBeat * 11.0))) : 0.92

        // 1. Punchy 4-on-the-floor Kick
        if fullDrums || (barIdx == 0 && beatInBar % 2 == 0) || (barIdx == 29 && beatInBar == 0) {
            if tBeat < 0.22 {
                let pitchEnv = 46.0 + 105.0 * exp(-tBeat * 36.0)
                let phase = 2.0 * Double.pi * (46.0 * tBeat + (105.0 / 36.0) * (1.0 - exp(-tBeat * 36.0)))
                let amp = exp(-tBeat * 14.5)
                let click = exp(-tBeat * 140.0) * 0.25 * sin(2.0 * Double.pi * 1650.0 * tBeat)
                let k = tanh((sin(phase) * amp + click) * 1.35) * 0.46
                _ = pitchEnv
                mixL += k
                mixR += k
            }
        }

        // 2. Crisp Stereo Nu-Disco Clap on beats 1 and 3 (0-indexed)
        if fullDrums && (beatInBar == 1 || beatInBar == 3) && tBeat < 0.16 {
            let n = whiteNoise()
            // Band-pass around 1.8 kHz
            let f = 0.22
            bpClapState1 += f * (n - bpClapState1 - 0.35 * bpClapState2)
            bpClapState2 += f * bpClapState1
            // Multi-tap micro-burst envelope for realistic handclap
            let e1 = tBeat < 0.010 ? exp(-tBeat * 180.0) : 0.0
            let e2 = tBeat >= 0.010 && tBeat < 0.022 ? exp(-(tBeat - 0.010) * 160.0) : 0.0
            let e3 = tBeat >= 0.022 ? exp(-(tBeat - 0.022) * 26.0) : 0.0
            let env = max(e1, max(e2, e3))
            let body = sin(2.0 * Double.pi * 215.0 * tBeat) * exp(-tBeat * 55.0) * 0.22
            let c = (bpClapState2 * env * 0.52 + body * 0.35)
            mixL += c * 0.95
            mixR += c * 1.05
        }

        // 3. Swung 16th Hi-Hat + Open Offbeat Hat
        let stepInBar = Int(inBar / stepSec) % 16
        let tStep = inBar - Double(stepInBar) * stepSec
        if fullDrums {
            let n = whiteNoise()
            let hp = n - hpHatState
            hpHatState = n * 0.84 + hpHatState * 0.16
            let isOffbeat = (stepInBar % 4 == 2)
            let decay = isOffbeat ? 22.0 : 68.0
            let gain = isOffbeat ? 0.11 : ((stepInBar % 2 == 0) ? 0.065 : 0.042)
            if tStep < 0.14 {
                let h = hp * exp(-tStep * decay) * gain
                mixL += h * 1.08
                mixR += h * 0.92
            }
        }

        // 4. Funky Filtered Slap/Synth Bass
        let bStep = bassSteps[stepInBar]
        if bStep.0 && barIdx < 30 {
            let gateDur = bStep.2 * stepSec
            if tStep < gateDur {
                let freq = midiToHz(bassRoots[chordIdx] + bStep.1)
                // Saw + sub-sine blend
                let ph1 = (freq * t).truncatingRemainder(dividingBy: 1.0)
                let ph2 = (freq * 1.004 * t).truncatingRemainder(dividingBy: 1.0)
                let sawL = (ph1 * 2.0 - 1.0) * 0.55 + sin(2.0 * Double.pi * (freq * 0.5) * t) * 0.55
                let sawR = (ph2 * 2.0 - 1.0) * 0.55 + sin(2.0 * Double.pi * (freq * 0.5) * t) * 0.55

                let env = exp(-tStep * 9.5) * (1.0 - exp(-tStep * 280.0))
                let cutoff = 0.045 + 0.18 * exp(-tStep * 18.0)
                lpBassL += cutoff * (sawL - lpBassL)
                lpBassR += cutoff * (sawR - lpBassR)

                mixL += lpBassL * env * sidechain * 0.34
                mixR += lpBassR * env * sidechain * 0.34
            }
        }

        // 5. Warm Stereo FM Electric Piano / Pluck Chords
        var activeStabStart = 0
        for s in [0, 3, 6, 10, 12, 14] where s <= stepInBar {
            activeStabStart = s
        }
        let tChord = inBar - Double(activeStabStart) * stepSec
        let chordHit = chordHitSteps.contains(activeStabStart)
        if chordHit && tChord < stepSec * 3.2 {
            let notes = chords[chordIdx]
            let env = exp(-tChord * 3.6) * (1.0 - exp(-tChord * 190.0))
            let tineEnv = exp(-tChord * 22.0) * 0.32
            var chL = 0.0
            var chR = 0.0
            for (ni, mNote) in notes.enumerated() {
                let f = midiToHz(mNote)
                let mod = sin(2.0 * Double.pi * f * 2.0 * t) * tineEnv
                let sig = sin(2.0 * Double.pi * f * t + mod)
                let pan = Double(ni) / 3.0 // 0 .. 1 stereo spread
                chL += sig * (0.72 - pan * 0.28)
                chR += sig * (0.44 + pan * 0.28)
            }
            mixL += chL * env * sidechain * 0.115
            mixR += chR * env * sidechain * 0.115
        }

        // 6. Bright Pentatonic Bell Sparkle in Feature Chapters
        if hasSparkle {
            let eighthIdx = Int(inBar / (stepSec * 2.0)) % 8
            let tEighth = inBar - Double(eighthIdx) * (stepSec * 2.0)
            if eighthIdx % 2 == 0 || eighthIdx == 3 || eighthIdx == 7 {
                let f = midiToHz(leadNotes[chordIdx][eighthIdx])
                let env = exp(-tEighth * 8.5) * (1.0 - exp(-tEighth * 250.0))
                let bell = sin(2.0 * Double.pi * f * t + 0.35 * exp(-tEighth * 18.0) * sin(2.0 * Double.pi * f * 3.0 * t))
                mixL += bell * env * sidechain * 0.052
                mixR += bell * env * sidechain * 0.060
            }
        }

        // 7. Frame-locked Tactile Glass UI Clicks
        for ct in uiClicks {
            let dt = t - ct
            if dt >= 0 && dt < 0.032 {
                let env = exp(-dt * 145.0)
                let chirp = sin(2.0 * Double.pi * (960.0 + 18000.0 * dt) * dt)
                let pop = chirp * env * 0.22
                mixL += pop
                mixR += pop
            }
        }

        // 8. Soft Shimmer Chime on Modal Open / Brand Reveals
        for mt in modalChimes {
            let dt = t - mt
            if dt >= 0 && dt < 0.55 {
                let env = exp(-dt * 6.5) * (1.0 - exp(-dt * 90.0))
                let s1 = sin(2.0 * Double.pi * midiToHz(77) * dt)
                let s2 = sin(2.0 * Double.pi * midiToHz(84) * dt)
                let s3 = sin(2.0 * Double.pi * midiToHz(89) * dt)
                let ch = (s1 + s2 * 0.8 + s3 * 0.6) * env * 0.065
                mixL += ch * 0.95
                mixR += ch * 1.05
            }
        }

        // Smooth master fade-in (0.15s) and fade-out (last 2.2s)
        var master = 0.88
        if t < 0.15 {
            master *= (t / 0.15)
        }
        if t > duration - 2.2 {
            let rem = max(0.0, (duration - t) / 2.2)
            master *= (rem * rem)
        }

        let outL = tanh(mixL * master)
        let outR = tanh(mixR * master)
        pcm[i * 2] = Int16(max(-1.0, min(1.0, outL)) * 32000.0)
        pcm[i * 2 + 1] = Int16(max(-1.0, min(1.0, outR)) * 32000.0)
    }

    // Write RIFF WAVE header + PCM payload
    let dataBytes = pcm.count * 2
    var header = Data(capacity: 44 + dataBytes)
    func appendASCII(_ s: String) { header.append(contentsOf: s.utf8) }
    func appendU32(_ v: UInt32) { var le = v.littleEndian; header.append(Data(bytes: &le, count: 4)) }
    func appendU16(_ v: UInt16) { var le = v.littleEndian; header.append(Data(bytes: &le, count: 2)) }

    appendASCII("RIFF")
    appendU32(UInt32(36 + dataBytes))
    appendASCII("WAVE")
    appendASCII("fmt ")
    appendU32(16)
    appendU16(1) // PCM
    appendU16(2) // Stereo
    appendU32(UInt32(sr))
    appendU32(UInt32(sr * 4))
    appendU16(4)
    appendU16(16)
    appendASCII("data")
    appendU32(UInt32(dataBytes))

    pcm.withUnsafeBytes { rawBuf in
        header.append(rawBuf.bindMemory(to: UInt8.self))
    }
    try header.write(to: URL(fileURLWithPath: path))
}

func encodeFramesAndMux(framesDir: String, frameCount: Int, fps: Int32, audioM4aPath: String, outMp4Path: String) throws {
    let width = 1920
    let height = 1080
    let tempVideoPath = outMp4Path + ".video_only.mp4"
    let fm = FileManager.default
    try? fm.removeItem(atPath: tempVideoPath)
    try? fm.removeItem(atPath: outMp4Path)

    let writer = try AVAssetWriter(outputURL: URL(fileURLWithPath: tempVideoPath), fileType: .mp4)
    let videoSettings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: 14_000_000,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
            AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2,
        ]
    ]
    let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
    writerInput.expectsMediaDataInRealTime = false

    let attrs: [String: Any] = [
        kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32ARGB),
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height,
    ]
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: writerInput, sourcePixelBufferAttributes: attrs)
    writer.add(writerInput)
    writer.startWriting()
    writer.startSession(atSourceTime: .zero)

    let colorSpace = CGColorSpaceCreateDeviceRGB()

    for idx in 0..<frameCount {
        autoreleasepool {
            while !writerInput.isReadyForMoreMediaData {
                Thread.sleep(forTimeInterval: 0.002)
            }
            let framePath = String(format: "%@/frame_%05d.jpg", framesDir, idx)
            guard let dataProvider = CGDataProvider(filename: framePath),
                  let cgImage = CGImage(jpegDataProviderSource: dataProvider, decode: nil, shouldInterpolate: false, intent: .defaultIntent),
                  let pool = adaptor.pixelBufferPool else {
                return
            }
            var pxBufOut: CVPixelBuffer?
            CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pxBufOut)
            guard let pxBuf = pxBufOut else { return }

            CVPixelBufferLockBaseAddress(pxBuf, [])
            if let base = CVPixelBufferGetBaseAddress(pxBuf) {
                let bpr = CVPixelBufferGetBytesPerRow(pxBuf)
                if let ctx = CGContext(
                    data: base,
                    width: width,
                    height: height,
                    bitsPerComponent: 8,
                    bytesPerRow: bpr,
                    space: colorSpace,
                    bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
                ) {
                    ctx.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
                }
            }
            CVPixelBufferUnlockBaseAddress(pxBuf, [])

            let pts = CMTime(value: CMTimeValue(idx), timescale: fps)
            adaptor.append(pxBuf, withPresentationTime: pts)
        }
    }

    writerInput.markAsFinished()
    let sem = DispatchSemaphore(value: 0)
    writer.finishWriting { sem.signal() }
    sem.wait()

    // Lossless passthrough mux of H.264 video + AAC audio with faststart
    let comp = AVMutableComposition()
    let vAsset = AVURLAsset(url: URL(fileURLWithPath: tempVideoPath))
    let aAsset = AVURLAsset(url: URL(fileURLWithPath: audioM4aPath))

    let vDur = vAsset.duration
    if let vSrc = vAsset.tracks(withMediaType: .video).first,
       let vDst = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) {
        try vDst.insertTimeRange(CMTimeRange(start: .zero, duration: vDur), of: vSrc, at: .zero)
    }
    if let aSrc = aAsset.tracks(withMediaType: .audio).first,
       let aDst = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
        let dur = CMTimeMinimum(vDur, aAsset.duration)
        try aDst.insertTimeRange(CMTimeRange(start: .zero, duration: dur), of: aSrc, at: .zero)
    }

    guard let exporter = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetPassthrough) else {
        throw NSError(domain: "PromoMux", code: 1)
    }
    exporter.outputURL = URL(fileURLWithPath: outMp4Path)
    exporter.outputFileType = .mp4
    exporter.shouldOptimizeForNetworkUse = true

    let expSem = DispatchSemaphore(value: 0)
    exporter.exportAsynchronously { expSem.signal() }
    expSem.wait()

    try? fm.removeItem(atPath: tempVideoPath)
    if exporter.status != .completed {
        throw exporter.error ?? NSError(domain: "PromoMux", code: 2)
    }
}

let args = CommandLine.arguments
if args.count >= 2 && args[1] == "audio" {
    let outWav = args[2]
    let dur = Double(args[3]) ?? 60.0
    try generateStereoWav(path: outWav, duration: dur)
    print("[audio] Wrote \(outWav)")
} else if args.count >= 7 && args[1] == "mux" {
    let framesDir = args[2]
    let frameCount = Int(args[3]) ?? 3600
    let fps = Int32(args[4]) ?? 60
    let audioM4a = args[5]
    let outMp4 = args[6]
    try encodeFramesAndMux(framesDir: framesDir, frameCount: frameCount, fps: fps, audioM4aPath: audioM4a, outMp4Path: outMp4)
    print("[mux] Wrote \(outMp4)")
} else {
    fputs("Invalid arguments\n", stderr)
    exit(1)
}
