// Native audio capture (Windows WASAPI) in its own PowerShell process.
// Listens to any output device (loopback: speakers, headphones, TV) or input device (microphone, line-in),
// whatever the Windows default is, and turns the sound into the same data the page used to get from
// Chromium's AnalyserNode: 1024 frequency bins (fftSize 2048, smoothing .6, -100..-30 dB mapped to 0..255)
// plus the raw sample peak, about 60 times a second.
//   start(id, isInput, onFrame, onEnd) -> stop()      id = endpoint id, or '' for the default output
const { spawn } = require('child_process');

const CS = String.raw`
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

public static class Cap {
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorCo {}
  [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceEnumerator {
    int EnumAudioEndpoints(int dataFlow, int stateMask, out IntPtr devices);
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device);
    int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, out IMMDevice device);
  }
  [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDevice { int Activate(ref Guid iid, int clsCtx, IntPtr p, [MarshalAs(UnmanagedType.IUnknown)] out object iface); }
  [ComImport, Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioClient {
    int Initialize(int shareMode, int streamFlags, long bufferDuration, long periodicity, IntPtr format, IntPtr session);
    int GetBufferSize(out uint frames); int GetStreamLatency(out long latency); int GetCurrentPadding(out uint padding);
    int IsFormatSupported(int shareMode, IntPtr format, out IntPtr closest); int GetMixFormat(out IntPtr format);
    int GetDevicePeriod(out long def, out long min); int Start(); int Stop(); int Reset(); int SetEventHandle(IntPtr h);
    int GetService(ref Guid iid, [MarshalAs(UnmanagedType.IUnknown)] out object service);
  }
  [ComImport, Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioCaptureClient {
    int GetBuffer(out IntPtr data, out int frames, out int flags, out long devPos, out long qpc);
    int ReleaseBuffer(int frames); int GetNextPacketSize(out int frames);
  }

  [DllImport("winmm.dll")] static extern uint timeBeginPeriod(uint ms);   // finer sleeps, for a steady ~60 frames a second
  const int N = 2048, BINS = 1024;
  static void Fft(double[] re, double[] im) {                      // in-place radix-2
    for (int i = 1, j = 0; i < N; i++) {
      int bit = N >> 1; for (; (j & bit) != 0; bit >>= 1) j ^= bit; j ^= bit;
      if (i < j) { double t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (int len = 2; len <= N; len <<= 1) {
      double ang = -2 * Math.PI / len, wr = Math.Cos(ang), wi = Math.Sin(ang);
      for (int i = 0; i < N; i += len) {
        double cr = 1, ci = 0;
        for (int k = 0; k < len / 2; k++) {
          int a = i + k, b = a + len / 2;
          double xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
          double nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  }

  public static void Run(string id, bool input) {
    timeBeginPeriod(1);
    var en = (IMMDeviceEnumerator)new MMDeviceEnumeratorCo();
    IMMDevice dev;
    if (string.IsNullOrEmpty(id)) Marshal.ThrowExceptionForHR(en.GetDefaultAudioEndpoint(input ? 1 : 0, 1, out dev));
    else Marshal.ThrowExceptionForHR(en.GetDevice(id, out dev));
    var iid = typeof(IAudioClient).GUID; object o;
    Marshal.ThrowExceptionForHR(dev.Activate(ref iid, 23, IntPtr.Zero, out o));
    var client = (IAudioClient)o;
    IntPtr fmt; Marshal.ThrowExceptionForHR(client.GetMixFormat(out fmt));
    int tag = Marshal.ReadInt16(fmt, 0) & 0xFFFF, ch = Marshal.ReadInt16(fmt, 2), bits = Marshal.ReadInt16(fmt, 14);
    int rate = Marshal.ReadInt32(fmt, 4);
    bool isFloat = tag == 3 || (tag == 0xFFFE && Marshal.ReadInt32(fmt, 24) == 3);   // IEEE float, plain or extensible
    if (!isFloat && bits != 16) throw new Exception("unsupported format");
    // shared mode; outputs are captured in loopback (what you hear), inputs directly
    Marshal.ThrowExceptionForHR(client.Initialize(0, input ? 0 : 0x00020000, 2000000, 0, fmt, IntPtr.Zero));
    var ciid = typeof(IAudioCaptureClient).GUID; object co;
    Marshal.ThrowExceptionForHR(client.GetService(ref ciid, out co));
    var cap = (IAudioCaptureClient)co;
    Marshal.ThrowExceptionForHR(client.Start());
    Console.Out.WriteLine("R " + rate);                              // ready, with the sample rate

    var ring = new float[N]; int pos = 0;
    var win = new double[N]; for (int i = 0; i < N; i++) win[i] = .42 - .5 * Math.Cos(2 * Math.PI * i / N) + .08 * Math.Cos(4 * Math.PI * i / N);   // Blackman, like AnalyserNode
    var smooth = new double[BINS]; var re = new double[N]; var im = new double[N]; var bytes = new byte[BINS];
    var clock = Stopwatch.StartNew(); long lastData = 0, lastFrame = 0; float peak = 0;
    var fbuf = new float[4096]; var sbuf = new short[4096];
    while (true) {
      int packet; cap.GetNextPacketSize(out packet);
      while (packet > 0) {
        IntPtr data; int frames, flags; long dp, qpc;
        Marshal.ThrowExceptionForHR(cap.GetBuffer(out data, out frames, out flags, out dp, out qpc));
        bool silent = (flags & 2) != 0;
        int n = frames * ch;
        if (fbuf.Length < n) { fbuf = new float[n]; sbuf = new short[n]; }
        if (!silent) { if (isFloat) Marshal.Copy(data, fbuf, 0, n); else { Marshal.Copy(data, sbuf, 0, n); for (int i = 0; i < n; i++) fbuf[i] = sbuf[i] / 32768f; } }
        for (int f = 0; f < frames; f++) {
          float sum = 0;
          if (!silent) for (int c = 0; c < ch; c++) { float s = fbuf[f * ch + c]; sum += s; if (Math.Abs(s) > peak) peak = Math.Abs(s); }
          ring[pos] = sum / ch; pos = (pos + 1) % N;
        }
        cap.ReleaseBuffer(frames);
        lastData = clock.ElapsedMilliseconds;
        cap.GetNextPacketSize(out packet);
      }
      long now = clock.ElapsedMilliseconds;
      if (now - lastData > 60) {                                     // nothing playing: loopback sends no packets, so feed silence
        int fill = (int)((now - lastData) * rate / 1000); if (fill > N) fill = N;
        for (int i = 0; i < fill; i++) { ring[pos] = 0; pos = (pos + 1) % N; }
        lastData = now;
      }
      if (now - lastFrame >= 16) {                                   // ~60 frames a second
        lastFrame = now;
        for (int i = 0; i < N; i++) { re[i] = ring[(pos + i) % N] * win[i]; im[i] = 0; }
        Fft(re, im);
        for (int k = 0; k < BINS; k++) {
          double mag = Math.Sqrt(re[k] * re[k] + im[k] * im[k]) / N;
          smooth[k] = .6 * smooth[k] + .4 * mag;
          double db = smooth[k] > 0 ? 20 * Math.Log10(smooth[k]) : -1000;
          double v = 255 * (db + 100) / 70; bytes[k] = (byte)(v < 0 ? 0 : v > 255 ? 255 : v);
        }
        Console.Out.WriteLine("F " + Convert.ToBase64String(bytes) + " " + peak.ToString("0.0000", System.Globalization.CultureInfo.InvariantCulture));
        Console.Out.Flush();
        peak = 0;
      }
      Thread.Sleep(2);
    }
  }
}
`;

function start(id, isInput, onFrame, onEnd) {
  if (process.platform !== 'win32') { onEnd && onEnd('unsupported'); return () => {}; }
  const safeId = String(id || '').replace(/[^\w{}.\-]/g, '');   // endpoint ids are {0.0.0.00000000}.{guid}
  const ps = `$ErrorActionPreference='Stop'\nAdd-Type -TypeDefinition @'\n${CS}\n'@\n[Cap]::Run('${safeId}', $${isInput ? 'true' : 'false'})`;
  const proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand',
    Buffer.from(ps, 'utf16le').toString('base64')], { windowsHide: true });
  let buf = '', ended = false;
  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', d => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (line[0] !== 'F') continue;
      const [, b64, peak] = line.split(' ');
      onFrame({ bins: Buffer.from(b64, 'base64'), peak: Number(peak) || 0 });
    }
  });
  const end = why => { if (!ended) { ended = true; onEnd && onEnd(why); } };
  proc.on('exit', code => end('exit ' + code));
  proc.on('error', e => end(e.message));
  return () => { ended = true; proc.kill(); };
}

module.exports = { start };
