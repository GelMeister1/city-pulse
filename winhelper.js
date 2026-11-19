// Small Windows helper: one long-lived PowerShell process with a few C# calls into Windows' audio and window APIs.
//   volume  -> master volume (0..1), mute and the default output device's id
//   outputs, inputs -> active output / input devices [{ id, name, default }]
//   wallpaper(hwnd, x, y, w, h) -> put a window behind the desktop icons; refreshWallpaper() repaints the normal wallpaper
//   unwall(hwnd) -> hide such a window and take it back out of Explorer's layer, so closing it doesn't wait on Explorer
// Requests are answered one JSON line each, in order. If PowerShell isn't available every call resolves to null; if it exits it restarts.
const { spawn } = require('child_process');

const CS = String.raw`
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public static class CP {
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorCo {}

  [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceEnumerator {
    int EnumAudioEndpoints(int dataFlow, int stateMask, out IMMDeviceCollection devices);
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device);
  }
  [ComImport, Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceCollection { int GetCount(out int count); int Item(int index, out IMMDevice device); }
  [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDevice {
    int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object iface);
    int OpenPropertyStore(int access, out IPropertyStore store);
    int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
  }
  [ComImport, Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPropertyStore { int GetCount(out int c); int GetAt(int i, out PROPERTYKEY k); int GetValue(ref PROPERTYKEY k, out PROPVARIANT v); }
  [StructLayout(LayoutKind.Sequential)] struct PROPERTYKEY { public Guid fmtid; public int pid; }
  [StructLayout(LayoutKind.Explicit)] struct PROPVARIANT { [FieldOffset(0)] public short vt; [FieldOffset(8)] public IntPtr p; [FieldOffset(16)] public IntPtr p2; }
  [ComImport, Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioEndpointVolume {
    int RegisterControlChangeNotify(IntPtr p); int UnregisterControlChangeNotify(IntPtr p); int GetChannelCount(out int c);
    int SetMasterVolumeLevel(float l, ref Guid ctx); int SetMasterVolumeLevelScalar(float l, ref Guid ctx);
    int GetMasterVolumeLevel(out float l); int GetMasterVolumeLevelScalar(out float l);
    int SetChannelVolumeLevel(uint ch, float l, ref Guid ctx); int SetChannelVolumeLevelScalar(uint ch, float l, ref Guid ctx);
    int GetChannelVolumeLevel(uint ch, out float l); int GetChannelVolumeLevelScalar(uint ch, out float l);
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool m, ref Guid ctx); int GetMute([MarshalAs(UnmanagedType.Bool)] out bool m);
  }

  static IMMDeviceEnumerator En() { return (IMMDeviceEnumerator)new MMDeviceEnumeratorCo(); }
  static string Esc(string s) { return s == null ? "" : s.Replace("\\", "\\\\").Replace("\"", "\\\""); }
  static string Name(IMMDevice d) {
    IPropertyStore ps; d.OpenPropertyStore(0, out ps);
    var key = new PROPERTYKEY { fmtid = new Guid("a45c254e-df1c-4efd-8020-67d146a850e0"), pid = 14 };   // PKEY_Device_FriendlyName
    PROPVARIANT v; ps.GetValue(ref key, out v);
    return v.vt == 31 ? Marshal.PtrToStringUni(v.p) : "";
  }

  public static string Volume() {
    IMMDevice d; En().GetDefaultAudioEndpoint(0, 1, out d);
    string id; d.GetId(out id);
    var iid = typeof(IAudioEndpointVolume).GUID; object o; d.Activate(ref iid, 23, IntPtr.Zero, out o);
    var ev = (IAudioEndpointVolume)o; float vol; bool mute; ev.GetMasterVolumeLevelScalar(out vol); ev.GetMute(out mute);
    return "{\"vol\":" + vol.ToString(System.Globalization.CultureInfo.InvariantCulture) + ",\"mute\":" + (mute ? "true" : "false") + ",\"id\":\"" + Esc(id) + "\"}";
  }

  public static string Outputs() { return Endpoints(0); }
  public static string Inputs() { return Endpoints(1); }
  static string Endpoints(int flow) {                                          // 0 = outputs (render), 1 = inputs (capture)
    var en = En(); string defId = "";
    try { IMMDevice def; en.GetDefaultAudioEndpoint(flow, 1, out def); def.GetId(out defId); } catch {}   // there may be no default input
    IMMDeviceCollection col; en.EnumAudioEndpoints(flow, 1, out col); int n; col.GetCount(out n);   // active devices only
    var parts = new List<string>();
    for (int i = 0; i < n; i++) {
      IMMDevice d; col.Item(i, out d); string id; d.GetId(out id);
      parts.Add("{\"id\":\"" + Esc(id) + "\",\"name\":\"" + Esc(Name(d)) + "\",\"default\":" + (id == defId ? "true" : "false") + "}");
    }
    return "[" + string.Join(",", parts) + "]";
  }

  // ---- live wallpaper: parent a window into the WorkerW layer behind the desktop icons ----
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindow(string c, string w);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr p, IntPtr after, string c, string w);
  [DllImport("user32.dll")] static extern IntPtr SendMessageTimeout(IntPtr h, uint msg, IntPtr w, IntPtr l, uint flags, uint timeout, out IntPtr res);
  [DllImport("user32.dll")] static extern IntPtr SetParent(IntPtr child, IntPtr parent);
  [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")] static extern IntPtr GetWindowLongPtr(IntPtr h, int i);
  [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW")] static extern IntPtr SetWindowLongPtr(IntPtr h, int i, IntPtr v);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int w, int hh, uint flags);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern bool SystemParametersInfo(uint a, uint b, StringBuilder c, uint d);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern bool SystemParametersInfo(uint a, uint b, string c, uint d);

  public static string Wallpaper(long hwnd, int x, int y, int w, int h) {
    IntPtr progman = FindWindow("Progman", null), r;
    SendMessageTimeout(progman, 0x052C, new IntPtr(0xD), new IntPtr(1), 0, 1000, out r);   // ask Explorer to create the WorkerW layer
    SendMessageTimeout(progman, 0x052C, IntPtr.Zero, IntPtr.Zero, 0, 1000, out r);
    IntPtr worker = FindWindowEx(progman, IntPtr.Zero, "WorkerW", null);                   // Windows 11 24H2 and later
    if (worker == IntPtr.Zero) EnumWindows((top, l) => {                                     // older Windows: the WorkerW after the icons' window
      if (FindWindowEx(top, IntPtr.Zero, "SHELLDLL_DefView", null) != IntPtr.Zero) worker = FindWindowEx(IntPtr.Zero, top, "WorkerW", null);
      return true;
    }, IntPtr.Zero);
    if (worker == IntPtr.Zero) return "{\"ok\":false}";
    var win = new IntPtr(hwnd);
    long style = GetWindowLongPtr(win, -16).ToInt64();                                     // GWL_STYLE: make it a proper child window
    style &= ~(0x80000000L | 0x00C00000L | 0x00040000L | 0x00080000L | 0x00030000L);        // no popup, caption, resize frame, menu, min/max
    SetWindowLongPtr(win, -16, new IntPtr(style | 0x40000000L));                             // WS_CHILD: the frame would eat a border
    SetParent(win, worker);
    SetWindowPos(new IntPtr(hwnd), IntPtr.Zero, x, y, w, h, 0x0040 | 0x0004 | 0x0020);     // SHOWWINDOW | NOZORDER | FRAMECHANGED, relative to the layer
    return "{\"ok\":true}";
  }

  public static string Unwall(long hwnd) {
    var win = new IntPtr(hwnd);
    ShowWindow(win, 0);                                                                       // SW_HIDE
    long style = GetWindowLongPtr(win, -16).ToInt64();
    SetWindowLongPtr(win, -16, new IntPtr((style & ~0x40000000L) | 0x80000000L));            // a top-level popup again, not WS_CHILD
    SetParent(win, IntPtr.Zero);
    return "{\"ok\":true}";
  }

  public static void RefreshWallpaper() {
    var sb = new StringBuilder(520);
    SystemParametersInfo(0x0073, 520, sb, 0);                                                 // SPI_GETDESKWALLPAPER
    SystemParametersInfo(0x0014, 0, sb.ToString(), 0x2);                                      // SPI_SETDESKWALLPAPER, broadcast change
  }
}
`;

const PS = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
${CS}
'@
[Console]::Out.WriteLine('{"ready":true}')
while ($true) {
  $line = [Console]::In.ReadLine(); if ($line -eq $null) { break }
  try {
    $p = $line.Split(' ')
    switch ($p[0]) {
      'volume'    { [Console]::Out.WriteLine([CP]::Volume()) }
      'outputs'   { [Console]::Out.WriteLine([CP]::Outputs()) }
      'inputs'    { [Console]::Out.WriteLine([CP]::Inputs()) }
      'wallpaper' { [Console]::Out.WriteLine([CP]::Wallpaper([long]$p[1], [int]$p[2], [int]$p[3], [int]$p[4], [int]$p[5])) }
      'unwall'    { [Console]::Out.WriteLine([CP]::Unwall([long]$p[1])) }
      'refresh'   { [CP]::RefreshWallpaper(); [Console]::Out.WriteLine('{"ok":true}') }
      default     { [Console]::Out.WriteLine('null') }
    }
  } catch { [Console]::Out.WriteLine('null') }
}
`;

let proc = null, buf = '', queue = [], ready = null, stopping = false;
function start() {
  if (process.platform !== 'win32' || proc) return;
  const encoded = Buffer.from(PS, 'utf16le').toString('base64');
  proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], { windowsHide: true });
  ready = new Promise(res => { queue.push(res); });          // the first line is the "ready" signal
  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', d => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line) continue;
      let val = null; try { val = JSON.parse(line); } catch {}
      const res = queue.shift(); if (res) res(val);
    }
  });
  proc.on('exit', () => { proc = null; buf = ''; queue.splice(0).forEach(r => r(null)); if (!stopping) setTimeout(start, 3000); });
  proc.on('error', () => { proc = null; queue.splice(0).forEach(r => r(null)); });
}
async function call(cmd) {
  if (!proc) return null;
  await ready;
  if (!proc) return null;
  return new Promise(res => { queue.push(res); proc.stdin.write(cmd + '\n'); });
}
const int = n => Math.round(Number(n)) | 0;

module.exports = {
  start,
  stop: () => { stopping = true; if (proc) proc.kill(); },
  volume: () => call('volume'),
  outputs: () => call('outputs'),
  inputs: () => call('inputs'),
  wallpaper: (hwnd, b) => call(`wallpaper ${BigInt(hwnd)} ${int(b.x)} ${int(b.y)} ${int(b.width)} ${int(b.height)}`),
  unwall: hwnd => call(`unwall ${BigInt(hwnd)}`),
  refreshWallpaper: () => call('refresh'),
};
