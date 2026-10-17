import type { TrackProcessor, ProcessorOptions } from "livekit-client";
import { Track } from "livekit-client";

export interface SelfieEnhancerConfig {
  enabled: boolean;
  strength: number; // 0 - 100
  lighting: number; // 0 - 100 (exposure & shadow lift)
  skinSmooth: number; // 0 - 100 (bilateral edge-preserving blur)
  compareMode: boolean; // split screen (original vs enhanced)
}

export const DEFAULT_ENHANCER_CONFIG: SelfieEnhancerConfig = {
  enabled: false,
  strength: 70,
  lighting: 60,
  skinSmooth: 75,
  compareMode: false,
};

const VERTEX_SHADER_SRC = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  // Invert Y coordinate so canvas texture orientation matches WebRTC orientation
  v_texCoord = vec2(a_texCoord.x, 1.0 - a_texCoord.y);
}
`;

const FRAGMENT_SHADER_SRC = `
precision mediump float;
precision mediump int;
varying vec2 v_texCoord;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_strength;
uniform float u_lighting;
uniform float u_smooth;
uniform float u_compare;
uniform float u_enabled;

// Skin detection in YCbCr color space
float getSkinToneWeight(vec3 rgb) {
  float cb = -0.168736 * rgb.r - 0.331264 * rgb.g + 0.5 * rgb.b + 0.5;
  float cr = 0.5 * rgb.r - 0.418688 * rgb.g - 0.081312 * rgb.b + 0.5;
  
  // Natural human skin range: Cb around 0.38 - 0.48, Cr around 0.54 - 0.66
  float cbDist = abs(cb - 0.43);
  float crDist = abs(cr - 0.60);
  
  float skin = smoothstep(0.12, 0.03, cbDist) * smoothstep(0.12, 0.03, crDist);
  return clamp(skin, 0.0, 1.0);
}

void main() {
  vec2 uv = v_texCoord;
  vec4 rawTexel = texture2D(u_image, uv);
  vec3 rawRgb = rawTexel.rgb;

  if (u_enabled < 0.5) {
    gl_FragColor = rawTexel;
    return;
  }

  // Split-screen comparison mode
  if (u_compare > 0.5) {
    float dist = abs(uv.x - 0.5);
    if (dist < (2.0 / u_resolution.x)) {
      // Crisp dividing separator line
      gl_FragColor = vec4(0.55, 0.75, 1.0, 1.0);
      return;
    }
    // Left side: original raw frame
    if (uv.x < 0.5) {
      gl_FragColor = rawTexel;
      return;
    }
  }

  // 1. Bilateral Edge-Preserving Skin Smoothing
  // Uses a 9-tap bilateral kernel weighted by spatial distance and color similarity
  vec2 pixelStep = (1.5 + u_smooth * 1.5) / u_resolution;
  vec3 smoothColor = vec3(0.0);
  float totalWeight = 0.0;
  float skinWeight = getSkinToneWeight(rawRgb);

  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 offset = vec2(float(x), float(y)) * pixelStep;
      vec3 sampleRgb = texture2D(u_image, uv + offset).rgb;

      float spatialDist = float(x * x + y * y);
      float spatialWeight = exp(-spatialDist / 2.0);

      // Color distance (high-contrast edges like eyes, eyebrows, glasses have large diff)
      float colorDiff = length(sampleRgb - rawRgb);
      float colorWeight = exp(-(colorDiff * colorDiff) / (0.015 + 0.025 * (1.0 - u_smooth)));

      float w = spatialWeight * colorWeight;
      smoothColor += sampleRgb * w;
      totalWeight += w;
    }
  }
  smoothColor /= max(totalWeight, 0.001);

  // Softly blend smoothed skin back over the raw frame, preserving non-skin features
  vec3 softenedRgb = mix(rawRgb, smoothColor, skinWeight * clamp(u_smooth * 1.15, 0.0, 1.0));

  // 2. Studio Lighting & Tone Curve Correction
  float lum = dot(softenedRgb, vec3(0.299, 0.587, 0.114));
  
  // Lift under-eye shadows and diffuse ambient lighting
  float shadowLift = (1.0 - lum) * lum * 1.4 * u_lighting;
  vec3 litRgb = softenedRgb + vec3(shadowLift * 0.20, shadowLift * 0.18, shadowLift * 0.15);

  // Studio ring-light warm tint (4500K balance)
  vec3 warmTone = vec3(1.02, 1.005, 0.985);
  litRgb = pow(litRgb * warmTone, vec3(1.0 - 0.14 * u_lighting));

  // 3. Blend by user-controlled strength slider (0% to 100%)
  vec3 finalRgb = mix(rawRgb, litRgb, clamp(u_strength, 0.0, 1.0));

  gl_FragColor = vec4(clamp(finalRgb, 0.0, 1.0), rawTexel.a);
}
`;

/**
 * Pure mathematical helper for unit tests verifying skin-tone weights
 */
export function calculateSkinToneWeight(r: number, g: number, b: number): number {
  const cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 0.5;
  const cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 0.5;
  const cbDist = Math.abs(cb - 0.43);
  const crDist = Math.abs(cr - 0.60);

  const smoothstep = (min: number, max: number, value: number) => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  };

  const skin = smoothstep(0.12, 0.03, cbDist) * smoothstep(0.12, 0.03, crDist);
  return Math.max(0, Math.min(1, skin));
}

/**
 * Pure mathematical helper for unit tests verifying shadow lift tone curve
 */
export function calculateShadowLift(lum: number, lightingFactor: number): number {
  return (1.0 - lum) * lum * 1.4 * lightingFactor;
}

export class SelfieEnhancerProcessor implements TrackProcessor<Track.Kind.Video> {
  readonly name = "selfie-enhancer";
  processedTrack?: MediaStreamTrack;

  private config: SelfieEnhancerConfig;
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private inputVideo: HTMLVideoElement | null = null;
  private mediaStream: MediaStream | null = null;
  private processedStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private videoFrameCallbackId: number | null = null;
  private isDestroyed = false;

  // Cached uniform locations
  private uResolutionLoc: WebGLUniformLocation | null = null;
  private uStrengthLoc: WebGLUniformLocation | null = null;
  private uLightingLoc: WebGLUniformLocation | null = null;
  private uSmoothLoc: WebGLUniformLocation | null = null;
  private uCompareLoc: WebGLUniformLocation | null = null;
  private uEnabledLoc: WebGLUniformLocation | null = null;

  constructor(initialConfig?: Partial<SelfieEnhancerConfig>) {
    this.config = {
      ...DEFAULT_ENHANCER_CONFIG,
      ...initialConfig,
    };
  }

  public getConfig(): SelfieEnhancerConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<SelfieEnhancerConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * TrackProcessor init method called by LiveKit when attached to a LocalVideoTrack
   */
  async init(opts: ProcessorOptions<Track.Kind.Video>): Promise<void> {
    this.isDestroyed = false;
    await this.setupPipeline(opts.track);
  }

  /**
   * TrackProcessor restart method called by LiveKit when underlying camera device changes
   */
  async restart(opts: ProcessorOptions<Track.Kind.Video>): Promise<void> {
    if (this.isDestroyed) return;
    await this.setupPipeline(opts.track);
  }

  /**
   * TrackProcessor destroy method called by LiveKit on disconnect or when processor is stopped
   */
  async destroy(): Promise<void> {
    this.isDestroyed = true;
    this.cleanup();
  }

  /**
   * Standalone attachment for Green Room preview streams
   */
  async attachToStream(sourceStream: MediaStream): Promise<MediaStream> {
    this.isDestroyed = false;
    const vTrack = sourceStream.getVideoTracks()[0];
    if (!vTrack) {
      throw new Error("No video track found in source stream");
    }
    await this.setupPipeline(vTrack);

    const outTracks: MediaStreamTrack[] = [];
    if (this.processedTrack) {
      outTracks.push(this.processedTrack);
    }
    // Retain audio tracks undisturbed
    sourceStream.getAudioTracks().forEach((aTrack) => outTracks.push(aTrack));
    return new MediaStream(outTracks);
  }

  public getProcessedStream(): MediaStream | null {
    return this.processedStream;
  }

  public getProcessedTrack(): MediaStreamTrack | null {
    return this.processedTrack || null;
  }

  private async setupPipeline(track: MediaStreamTrack): Promise<void> {
    // 1. Create hidden input video element to ingest the raw camera track
    if (!this.inputVideo) {
      const vid = document.createElement("video");
      vid.autoplay = true;
      vid.playsInline = true;
      vid.muted = true;
      vid.style.position = "fixed";
      vid.style.top = "-9999px";
      vid.style.left = "-9999px";
      vid.style.opacity = "0";
      vid.style.pointerEvents = "none";
      document.body.appendChild(vid);
      this.inputVideo = vid;
    }

    this.mediaStream = new MediaStream([track]);
    this.inputVideo.srcObject = this.mediaStream;

    try {
      await this.inputVideo.play();
    } catch {
      // In case autoplay policy triggers, video will play on user interaction
    }

    // 2. Wait for video metadata if not yet available
    if (this.inputVideo.readyState < 1) {
      await new Promise<void>((resolve) => {
        const onLoaded = () => {
          this.inputVideo?.removeEventListener("loadedmetadata", onLoaded);
          resolve();
        };
        this.inputVideo?.addEventListener("loadedmetadata", onLoaded);
        setTimeout(resolve, 250);
      });
    }

    // 3. Setup Canvas with real dimensions
    const width = this.inputVideo.videoWidth || track.getSettings().width || 1280;
    const height = this.inputVideo.videoHeight || track.getSettings().height || 720;

    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
    }
    this.canvas.width = width;
    this.canvas.height = height;

    // 4. Initialize WebGL context
    this.initWebGL();

    // 5. Capture Canvas stream with safe pass-through fallback
    if (!this.processedStream || !this.processedTrack || this.processedTrack.readyState === "ended") {
      if (typeof this.canvas.captureStream === "function") {
        this.processedStream = this.canvas.captureStream(30);
        this.processedTrack = this.processedStream.getVideoTracks()[0];
      } else {
        // Safe fallback for environments lacking captureStream
        this.processedTrack = track;
      }
    }

    // 6. Start render cycle
    this.startRenderLoop();
  }

  private initWebGL(): void {
    if (!this.canvas) return;

    const gl =
      this.canvas.getContext("webgl", {
        alpha: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        antialias: false,
      }) || (this.canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    if (!gl) {
      console.warn("WebGL not supported, beauty processor running in bypass mode.");
      return;
    }
    this.gl = gl;

    // Compile shaders
    const vertShader = this.compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fragShader = this.compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);

    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("WebGL program link error:", gl.getProgramInfoLog(program));
      return;
    }
    this.program = program;
    gl.useProgram(program);

    // Quad geometry (full screen quad with texture coords)
    // [pos.x, pos.y, tex.x, tex.y]
    const quadVertices = new Float32Array([
      -1, -1, 0, 0,
       1, -1, 1, 0,
      -1,  1, 0, 1,
      -1,  1, 0, 1,
       1, -1, 1, 0,
       1,  1, 1, 1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const aPosLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 4 * 4, 0);

    const aTexLoc = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(aTexLoc);
    gl.vertexAttribPointer(aTexLoc, 2, gl.FLOAT, false, 4 * 4, 2 * 4);

    // Setup input texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.texture = texture;

    // Cache uniform locations
    this.uResolutionLoc = gl.getUniformLocation(program, "u_resolution");
    this.uStrengthLoc = gl.getUniformLocation(program, "u_strength");
    this.uLightingLoc = gl.getUniformLocation(program, "u_lighting");
    this.uSmoothLoc = gl.getUniformLocation(program, "u_smooth");
    this.uCompareLoc = gl.getUniformLocation(program, "u_compare");
    this.uEnabledLoc = gl.getUniformLocation(program, "u_enabled");
  }

  private compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private startRenderLoop(): void {
    this.stopRenderLoop();

    const render = () => {
      if (this.isDestroyed) return;

      this.renderFrame();

      // Prefer requestVideoFrameCallback for hardware sync if available
      const vid = this.inputVideo as (HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => number;
        cancelVideoFrameCallback?: (id: number) => void;
      }) | null;

      if (vid && typeof vid.requestVideoFrameCallback === "function") {
        this.videoFrameCallbackId = vid.requestVideoFrameCallback(render);
      } else {
        this.animationFrameId = requestAnimationFrame(render);
      }
    };

    render();
  }

  private stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    const vid = this.inputVideo as (HTMLVideoElement & {
      cancelVideoFrameCallback?: (id: number) => void;
    }) | null;
    if (this.videoFrameCallbackId !== null && vid?.cancelVideoFrameCallback) {
      vid.cancelVideoFrameCallback(this.videoFrameCallbackId);
      this.videoFrameCallbackId = null;
    }
  }

  private renderFrame(): void {
    const video = this.inputVideo;
    const canvas = this.canvas;
    const gl = this.gl;
    const program = this.program;

    if (!video || !canvas || video.readyState < 2) return;

    // Dynamically adjust canvas to input video dimensions
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        if (gl) {
          gl.viewport(0, 0, canvas.width, canvas.height);
        }
      }
    }

    if (!gl || !program || !this.texture) {
      // 2D fallback if WebGL is unavailable
      const ctx2d = canvas.getContext("2d");
      if (ctx2d) {
        ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      return;
    }

    gl.useProgram(program);

    // Upload video frame to WebGL texture
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    // Apply uniforms
    gl.uniform2f(this.uResolutionLoc, canvas.width, canvas.height);
    gl.uniform1f(this.uStrengthLoc, this.config.strength / 100);
    gl.uniform1f(this.uLightingLoc, this.config.lighting / 100);
    gl.uniform1f(this.uSmoothLoc, this.config.skinSmooth / 100);
    gl.uniform1f(this.uCompareLoc, this.config.compareMode ? 1.0 : 0.0);
    gl.uniform1f(this.uEnabledLoc, this.config.enabled ? 1.0 : 0.0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private cleanup(): void {
    this.stopRenderLoop();

    if (this.inputVideo) {
      this.inputVideo.srcObject = null;
      if (this.inputVideo.parentNode) {
        this.inputVideo.parentNode.removeChild(this.inputVideo);
      }
      this.inputVideo = null;
    }

    if (this.mediaStream) {
      this.mediaStream = null;
    }

    if (this.processedTrack) {
      this.processedTrack.stop();
      this.processedTrack = undefined;
    }

    if (this.processedStream) {
      this.processedStream = null;
    }

    if (this.gl && this.program) {
      if (this.texture) {
        this.gl.deleteTexture(this.texture);
        this.texture = null;
      }
      this.gl.deleteProgram(this.program);
      this.program = null;
      this.gl = null;
    }

    this.canvas = null;
  }
}

// Global processor singleton instance for application lifecycle sharing
let globalEnhancer: SelfieEnhancerProcessor | null = null;

export function getSharedSelfieEnhancer(initialConfig?: Partial<SelfieEnhancerConfig>): SelfieEnhancerProcessor {
  if (!globalEnhancer) {
    globalEnhancer = new SelfieEnhancerProcessor(initialConfig);
  } else if (initialConfig) {
    globalEnhancer.updateConfig(initialConfig);
  }
  return globalEnhancer;
}
